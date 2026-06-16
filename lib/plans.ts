import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, PlanStatus, PlanSummary, PlaceType } from "@/types";

// Plan persistence + history. The deterministic engine generates a Plan in
// memory (lib/generatePlan.ts); these helpers write it to public.plans, mark it
// confirmed when the host accepts, and read a user's plans back for the Plans
// tab history. No AI here.
//
// Split: the pure mappers (planSummaryFromRow, splitByTime) are unit-tested;
// the DB wrappers (persistPlan, confirmPlan, listPlanSummaries) are covered by
// scripts/smoke-plans.ts against the live DB.

// Shape of a public.plans row joined with its place + resolved attendee names.
export interface PlanRow {
  id: string;
  activity_type: string;
  date_time: string;
  vibe: string[];
  attendee_user_ids: string[];
  confirmed_at: string | null;
}

export interface PlaceLite {
  name: string;
  neighborhood: string;
  type: PlaceType;
}

// ----------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ----------------------------------------------------------------------------

export function statusFromRow(confirmedAt: string | null | undefined): PlanStatus {
  return confirmedAt ? "confirmed" : "ready";
}

/** Map a joined plans row into the card-level PlanSummary. `attendeeNames` is a
 *  lookup of userId → displayName for resolving the avatar stack; ids missing
 *  from it are still counted but only the first few resolved names are kept. */
export function planSummaryFromRow(
  row: PlanRow,
  place: PlaceLite,
  attendeeNames: Map<string, string>,
  previewCount = 3,
): PlanSummary {
  const attendees = row.attendee_user_ids
    .map((userId) => ({ userId, displayName: attendeeNames.get(userId) }))
    .filter((a): a is { userId: string; displayName: string } => Boolean(a.displayName))
    .slice(0, previewCount);

  return {
    id: row.id,
    activityType: row.activity_type,
    place: { name: place.name, neighborhood: place.neighborhood, type: place.type },
    dateTime: row.date_time,
    vibe: row.vibe ?? [],
    attendeeCount: row.attendee_user_ids.length,
    attendees,
    status: statusFromRow(row.confirmed_at),
  };
}

/** Partition summaries into upcoming (dateTime >= now, soonest first) and past
 *  (dateTime < now, most recent first). */
export function splitByTime(
  summaries: PlanSummary[],
  nowIso: string,
): { upcoming: PlanSummary[]; past: PlanSummary[] } {
  const now = new Date(nowIso).getTime();
  const upcoming: PlanSummary[] = [];
  const past: PlanSummary[] = [];
  for (const s of summaries) {
    if (new Date(s.dateTime).getTime() >= now) upcoming.push(s);
    else past.push(s);
  }
  upcoming.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  past.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  return { upcoming, past };
}

// ----------------------------------------------------------------------------
// DB wrappers (smoke-tested)
// ----------------------------------------------------------------------------

/** Persist a generated Plan and return the stored plan id. Dedupes: if the host
 *  already has an upcoming plan, returns its id instead of inserting a new row,
 *  so repeat /api/plan/create calls (cleared cache, deep links) don't pile up
 *  duplicates. Honors the "one good Plan at a time" product principle. */
export async function persistPlan(sb: SupabaseClient, plan: Plan): Promise<string> {
  const nowIso = new Date().toISOString();

  const { data: existing, error: lookupErr } = await sb
    .from("plans")
    .select("id")
    .eq("host_user_id", plan.hostUserId)
    .gte("date_time", nowIso)
    .order("date_time", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (lookupErr) throw new Error(`Plan lookup failed: ${lookupErr.message}`);
  if (existing) return existing.id as string;

  const { data, error } = await sb
    .from("plans")
    .insert({
      host_user_id: plan.hostUserId,
      activity_type: plan.activityType,
      place_id: plan.place.id,
      date_time: plan.dateTime,
      vibe: plan.vibe,
      attendee_user_ids: plan.attendees.map((a) => a.userId),
      why_this_plan: plan.whyThisPlan,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Plan insert failed: ${error?.message}`);
  return data.id as string;
}

/** Mark a plan confirmed. RLS restricts the update to the plan's host. */
export async function confirmPlan(sb: SupabaseClient, planId: string): Promise<void> {
  const { error } = await sb
    .from("plans")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", planId);
  if (error) throw new Error(`Plan confirm failed: ${error.message}`);
}

/** List the plans hosted by the user behind `authUserId`, newest first, mapped
 *  to PlanSummary. Resolves the place and a few attendee names per plan. */
export async function listPlanSummaries(
  sb: SupabaseClient,
  authUserId: string,
): Promise<PlanSummary[]> {
  // Resolve the caller's public.users id from their auth id.
  const { data: me, error: meErr } = await sb
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (meErr) throw new Error(`User lookup failed: ${meErr.message}`);
  if (!me) return [];

  const { data: rows, error: plansErr } = await sb
    .from("plans")
    .select(
      "id, activity_type, date_time, vibe, attendee_user_ids, confirmed_at, places(name, neighborhood, type)",
    )
    .eq("host_user_id", me.id)
    .order("date_time", { ascending: false });
  if (plansErr) throw new Error(`Plans query failed: ${plansErr.message}`);
  if (!rows || rows.length === 0) return [];

  // One query for every attendee name referenced across all plans.
  const allAttendeeIds = [...new Set(rows.flatMap((r) => r.attendee_user_ids ?? []))];
  const attendeeNames = new Map<string, string>();
  if (allAttendeeIds.length > 0) {
    const { data: people, error: peopleErr } = await sb
      .from("users")
      .select("id, display_name")
      .in("id", allAttendeeIds);
    if (peopleErr) throw new Error(`Attendee lookup failed: ${peopleErr.message}`);
    for (const p of people ?? []) attendeeNames.set(p.id, p.display_name);
  }

  return rows.map((r) => {
    // Supabase types the embedded relation as an array; it's a single row here.
    const placeRel = Array.isArray(r.places) ? r.places[0] : r.places;
    const place: PlaceLite = placeRel ?? { name: "A spot in Berlin", neighborhood: "Berlin", type: "venue" };
    return planSummaryFromRow(
      {
        id: r.id,
        activity_type: r.activity_type,
        date_time: r.date_time,
        vibe: r.vibe,
        attendee_user_ids: r.attendee_user_ids ?? [],
        confirmed_at: r.confirmed_at,
      },
      place,
      attendeeNames,
    );
  });
}
