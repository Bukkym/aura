import { createClient } from "../lib/supabase/admin";
import { generatePlan } from "../lib/generatePlan";
import { persistPlan, confirmPlan, listPlanSummaries } from "../lib/plans";
import { userFromRow } from "../lib/userRow";

// End-to-end check for plan persistence (Module 4 M4.1). Uses the admin client,
// which bypasses RLS, so it can stand in for a host without a real auth session.
//
//   1. generate a plan for a seed host
//   2. persist it, assert a row id comes back
//   3. persist again, assert the dedupe returns the same id (no duplicate)
//   4. confirm it, assert confirmed_at is set
//   5. list summaries by the host's auth id, assert the plan is present + confirmed
//   6. clean up the test row
//
// Run with: npm run smoke:plans
//
// Note: generatePlan still hits OpenAI in some paths only if EMBED_ALLOW_RUNTIME
// is set; here it does not, so this is a pure deterministic + DB round-trip.

const HOST_DISPLAY_NAME = "Sofia";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function main() {
  const sb = createClient();

  const { data: row, error } = await sb
    .from("users")
    .select("*")
    .eq("display_name", HOST_DISPLAY_NAME)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load host: ${error.message}`);
  if (!row) throw new Error(`No seed user with display_name=${HOST_DISPLAY_NAME}`);

  const host = userFromRow(row);
  console.log(`Host: ${host.displayName} (id=${host.userId})\n`);

  // Clear any leftover plans for this host so the run is deterministic.
  await sb.from("plans").delete().eq("host_user_id", host.userId);

  const plan = await generatePlan(sb, host);

  const id1 = await persistPlan(sb, plan);
  assert(typeof id1 === "string" && id1.length > 0, "persistPlan returns an id");
  console.log(`Persisted plan id=${id1}`);

  const id2 = await persistPlan(sb, plan);
  assert(id2 === id1, `dedupe reuses the same row (got ${id2}, expected ${id1})`);
  console.log("Dedupe ok: repeat persist reused the same row");

  const { count } = await sb
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("host_user_id", host.userId);
  assert(count === 1, `exactly one row for the host (got ${count})`);

  await confirmPlan(sb, id1);
  const { data: confirmed } = await sb
    .from("plans")
    .select("confirmed_at")
    .eq("id", id1)
    .single();
  assert(confirmed?.confirmed_at, "confirmed_at is set after confirmPlan");
  console.log(`Confirmed at ${confirmed?.confirmed_at}`);

  // Resolve the host's auth id to exercise listPlanSummaries. Seed users have
  // auth_user_id = null, so fall back to faking the join via the public id.
  const summaries = host.userId
    ? await listSummariesForPublicUser(sb, host.userId)
    : [];
  assert(summaries.length === 1, `one summary for the host (got ${summaries.length})`);
  const s = summaries[0];
  assert(s.id === id1, "summary id matches");
  assert(s.status === "confirmed", `summary status confirmed (got ${s.status})`);
  assert(s.activityType === plan.activityType, "summary activity matches");
  assert(s.place.name === plan.place.name, "summary place matches");
  console.log(
    `Summary: ${s.activityType} @ ${s.place.name} · ${s.attendeeCount} people · ${s.status}`,
  );

  // Clean up.
  await sb.from("plans").delete().eq("host_user_id", host.userId);
  console.log("\nCleaned up. smoke:plans OK");
}

// Seed users have no auth_user_id, so listPlanSummaries (which resolves auth ->
// public id) can't be used directly. Re-run its query keyed on the public id so
// we still exercise planSummaryFromRow end-to-end.
import { planSummaryFromRow } from "../lib/plans";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanSummary } from "../types";

async function listSummariesForPublicUser(
  sb: SupabaseClient,
  publicUserId: string,
): Promise<PlanSummary[]> {
  const { data: rows, error } = await sb
    .from("plans")
    .select(
      "id, activity_type, date_time, vibe, attendee_user_ids, confirmed_at, places(name, neighborhood, type)",
    )
    .eq("host_user_id", publicUserId)
    .order("date_time", { ascending: false });
  if (error) throw new Error(error.message);
  if (!rows) return [];

  const allAttendeeIds = [...new Set(rows.flatMap((r) => r.attendee_user_ids ?? []))];
  const names = new Map<string, string>();
  if (allAttendeeIds.length > 0) {
    const { data: people } = await sb
      .from("users")
      .select("id, display_name")
      .in("id", allAttendeeIds);
    for (const p of people ?? []) names.set(p.id, p.display_name);
  }

  return rows.map((r) => {
    const placeRel = Array.isArray(r.places) ? r.places[0] : r.places;
    const place = placeRel ?? { name: "A spot in Berlin", neighborhood: "Berlin", type: "venue" as const };
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
      names,
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
