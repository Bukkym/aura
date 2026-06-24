import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Place, PlanStatus, PlanSummary, PlaceType, User } from "@/types";
import { userFromRow } from "./userRow";

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
  declined_at?: string | null;
}

export interface PlaceLite {
  name: string;
  neighborhood: string;
  type: PlaceType;
}

/** What a "request another Plan" asked to change. Stored on the plan row so a
 *  refined regeneration is distinguishable from the first plan. */
export interface PlanRefinement {
  activityType?: string;
  excludeUserIds?: string[];
}

// ----------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ----------------------------------------------------------------------------

export function statusFromRow(
  confirmedAt: string | null | undefined,
  declinedAt: string | null | undefined = null,
): PlanStatus {
  if (declinedAt) return "declined";
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
    status: statusFromRow(row.confirmed_at, row.declined_at),
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

/** Persist a generated Plan and return the stored plan id. Dedupes on the
 *  identity of the plan (same host + activity + place, still upcoming and not
 *  declined): a repeat of the *same* request (cleared cache, deep links) reuses
 *  the existing row, but a different activity or place (a refined "request
 *  another Plan") inserts a new row, so users can hold more than one plan. A
 *  declined plan does not block re-offering the same one later. */
export async function persistPlan(
  sb: SupabaseClient,
  plan: Plan,
  refinement?: PlanRefinement,
): Promise<string> {
  const nowIso = new Date().toISOString();

  const { data: existing, error: lookupErr } = await sb
    .from("plans")
    .select("id")
    .eq("host_user_id", plan.hostUserId)
    .eq("activity_type", plan.activityType)
    .eq("place_id", plan.place.id)
    .is("declined_at", null)
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
      refinement: refinement ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Plan insert failed: ${error?.message}`);
  return data.id as string;
}

/** Count a host's non-declined plans created on or after `sinceIso` (host id is
 *  the public.users id). Ready for a future per-period quota, e.g. one free Plan
 *  a week before a subscription is required; not enforced yet. */
export async function countPlansSince(
  sb: SupabaseClient,
  hostUserId: string,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await sb
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("host_user_id", hostUserId)
    .is("declined_at", null)
    .gte("created_at", sinceIso);
  if (error) throw new Error(`Plan count failed: ${error.message}`);
  return count ?? 0;
}

/** Mark a plan confirmed. RLS restricts the update to the plan's host. */
export async function confirmPlan(sb: SupabaseClient, planId: string): Promise<void> {
  const { error } = await sb
    .from("plans")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", planId);
  if (error) throw new Error(`Plan confirm failed: ${error.message}`);
}

/** Mark a plan declined ("Not now"). It drops out of the user's active lists
 *  but stays on the row. RLS restricts the update to the plan's host. */
export async function declinePlan(sb: SupabaseClient, planId: string): Promise<void> {
  const { error } = await sb
    .from("plans")
    .update({ declined_at: new Date().toISOString() })
    .eq("id", planId);
  if (error) throw new Error(`Plan decline failed: ${error.message}`);
}

/** Count all plans for a host (public.users id), including declined, so Home can
 *  tell a brand-new user (generate a first plan) from one who has declined or
 *  used up their plans (show the empty "request another" state instead of
 *  regenerating the same one). */
export async function countAllPlans(sb: SupabaseClient, hostUserId: string): Promise<number> {
  const { count, error } = await sb
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("host_user_id", hostUserId);
  if (error) throw new Error(`Plan count failed: ${error.message}`);
  return count ?? 0;
}

/** Rehydrate the host's current plan (the most recently created, non-declined,
 *  upcoming one) into a full in-memory Plan + its host + status, so Home can
 *  show the real current plan from the DB instead of regenerating from the
 *  profile. Keyed on the public.users id. Returns null when there is no active
 *  plan. The route maps this through buildPlanResponse. */
export async function loadCurrentPlanContext(
  sb: SupabaseClient,
  hostUserId: string,
): Promise<{ plan: Plan; host: User; status: PlanStatus } | null> {
  const nowIso = new Date().toISOString();
  const { data: row, error } = await sb
    .from("plans")
    .select(
      "id, host_user_id, activity_type, place_id, date_time, vibe, attendee_user_ids, why_this_plan, confirmed_at, declined_at",
    )
    .eq("host_user_id", hostUserId)
    .is("declined_at", null)
    .gte("date_time", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Current plan lookup failed: ${error.message}`);
  if (!row) return null;

  const { data: hostRow, error: hostErr } = await sb
    .from("users")
    .select("*")
    .eq("id", hostUserId)
    .maybeSingle();
  if (hostErr) throw new Error(`Host lookup failed: ${hostErr.message}`);
  if (!hostRow) return null;
  const host = userFromRow(hostRow);

  const { data: placeRow, error: placeErr } = await sb
    .from("places")
    .select("*")
    .eq("id", row.place_id)
    .maybeSingle();
  if (placeErr) throw new Error(`Place lookup failed: ${placeErr.message}`);
  const place: Place = placeRow
    ? {
        id: placeRow.id,
        name: placeRow.name,
        type: placeRow.type,
        neighborhood: placeRow.neighborhood,
        address: placeRow.address ?? "",
        activityTypeTags: placeRow.activity_type_tags ?? [],
        vibeTags: placeRow.vibe_tags ?? [],
        description: placeRow.description ?? "",
        embedding: [],
      }
    : { id: row.place_id, name: "A spot in Berlin", type: "venue", neighborhood: "Berlin", address: "", activityTypeTags: [], vibeTags: [], description: "", embedding: [] };

  const ids: string[] = row.attendee_user_ids ?? [];
  let attendees: User[] = [];
  if (ids.length > 0) {
    const { data: people, error: peopleErr } = await sb
      .from("users")
      .select("*")
      .in("id", ids);
    if (peopleErr) throw new Error(`Attendee lookup failed: ${peopleErr.message}`);
    const byId = new Map((people ?? []).map((p) => [p.id, userFromRow(p)]));
    attendees = ids.map((id) => byId.get(id)).filter((u): u is User => Boolean(u));
  }

  const plan: Plan = {
    planId: row.id,
    hostUserId: row.host_user_id,
    activityType: row.activity_type,
    place,
    dateTime: row.date_time,
    vibe: row.vibe ?? [],
    attendees,
    whyThisPlan: row.why_this_plan,
  };

  return { plan, host, status: statusFromRow(row.confirmed_at, row.declined_at) };
}

/** Whether the signed-in auth user has completed onboarding, i.e. a public.users
 *  profile row keyed on their auth id exists. This, not plan count, is the
 *  onboarding-complete signal: a user whose only plan was declined (or whose
 *  first plan never generated) still has a profile but no *active* plans, and
 *  must not be bounced back into onboarding. Keyed on auth_user_id (indexed). */
export async function profileExists(
  sb: SupabaseClient,
  authUserId: string,
): Promise<boolean> {
  const { data, error } = await sb
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw new Error(`Profile lookup failed: ${error.message}`);
  return Boolean(data);
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
      "id, activity_type, date_time, vibe, attendee_user_ids, confirmed_at, declined_at, places(name, neighborhood, type)",
    )
    .eq("host_user_id", me.id)
    .is("declined_at", null)
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
        declined_at: r.declined_at,
      },
      place,
      attendeeNames,
    );
  });
}
