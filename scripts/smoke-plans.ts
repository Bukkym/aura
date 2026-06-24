import { createClient } from "../lib/supabase/admin";
import { generatePlan } from "../lib/generatePlan";
import { persistPlan, confirmPlan, declinePlan, countPlansSince, countAllPlans, loadCurrentPlanContext, listPlanSummaries } from "../lib/plans";
import { userFromRow } from "../lib/userRow";

// End-to-end check for plan persistence (Module 4 M4.1). Uses the admin client,
// which bypasses RLS, so it can stand in for a requester without a real auth session.
//
//   1. generate a plan for a seed requester
//   2. persist it, assert a row id comes back
//   3. persist again, assert the dedupe returns the same id (no duplicate)
//   4. confirm it, assert confirmed_at is set
//   5. list summaries by the requester's auth id, assert the plan is present + confirmed
//   6. clean up the test row
//
// Run with: npm run smoke:plans
//
// Note: generatePlan still hits OpenAI in some paths only if EMBED_ALLOW_RUNTIME
// is set; here it does not, so this is a pure deterministic + DB round-trip.

const REQUESTER_DISPLAY_NAME = "Sofia";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function main() {
  const sb = createClient();

  const { data: row, error } = await sb
    .from("users")
    .select("*")
    .eq("display_name", REQUESTER_DISPLAY_NAME)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load requester: ${error.message}`);
  if (!row) throw new Error(`No seed user with display_name=${REQUESTER_DISPLAY_NAME}`);

  const requester = userFromRow(row);
  console.log(`Requester: ${requester.displayName} (id=${requester.userId})\n`);

  // Clear any leftover plans for this requester so the run is deterministic.
  await sb.from("plans").delete().eq("created_for_user_id", requester.userId);

  const plan = await generatePlan(sb, requester);

  const id1 = await persistPlan(sb, plan);
  assert(typeof id1 === "string" && id1.length > 0, "persistPlan returns an id");
  console.log(`Persisted plan id=${id1}`);

  const id2 = await persistPlan(sb, plan);
  assert(id2 === id1, `dedupe reuses the same row (got ${id2}, expected ${id1})`);
  console.log("Dedupe ok: repeat persist reused the same row");

  const { count } = await sb
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("created_for_user_id", requester.userId);
  assert(count === 1, `exactly one row for the requester (got ${count})`);

  await confirmPlan(sb, id1);
  const { data: confirmed } = await sb
    .from("plans")
    .select("confirmed_at")
    .eq("id", id1)
    .single();
  assert(confirmed?.confirmed_at, "confirmed_at is set after confirmPlan");
  console.log(`Confirmed at ${confirmed?.confirmed_at}`);

  // Resolve the requester's auth id to exercise listPlanSummaries. Seed users have
  // auth_user_id = null, so fall back to faking the join via the public id.
  const summaries = requester.userId
    ? await listSummariesForPublicUser(sb, requester.userId)
    : [];
  assert(summaries.length === 1, `one summary for the requester (got ${summaries.length})`);
  const s = summaries[0];
  assert(s.id === id1, "summary id matches");
  assert(s.status === "confirmed", `summary status confirmed (got ${s.status})`);
  assert(s.activityType === plan.activityType, "summary activity matches");
  assert(s.place.name === plan.place.name, "summary place matches");
  console.log(
    `Summary: ${s.activityType} @ ${s.place.name} · ${s.attendeeCount} people · ${s.status}`,
  );

  // Refinement engine options: a different activity yields a different plan
  // (and a new persisted row, since the relaxed dedupe keys on activity+place).
  const refined = await generatePlan(sb, requester, { activityOverride: "techno clubs" });
  assert(
    refined.activityType === "techno clubs",
    `activityOverride takes effect (got ${refined.activityType})`,
  );
  const refinedId = await persistPlan(sb, refined, { activityType: "techno clubs" });
  assert(refinedId !== id1, "a different activity persists as a new row (keep both)");
  console.log(`Refined plan id=${refinedId} · ${refined.activityType}`);

  // Excluding the first plan's attendees draws a different group.
  const excludeIds = plan.attendees.map((a) => a.userId);
  const reseated = await generatePlan(sb, requester, { excludeUserIds: excludeIds });
  assert(
    reseated.attendees.every((a) => !excludeIds.includes(a.userId)),
    "excludeUserIds removes the named people from the group",
  );
  console.log(`Reseated group: ${reseated.attendees.map((a) => a.displayName).join(", ") || "(none)"}`);

  // Count helper (ready for a future quota): the requester now has 2 active plans.
  const activeCount = await countPlansSince(sb, requester.userId, "2000-01-01T00:00:00.000Z");
  assert(activeCount === 2, `countPlansSince sees both active plans (got ${activeCount})`);
  console.log(`Active plan count: ${activeCount}`);

  // Current-plan rehydration: the most recently created active plan (the refined
  // one) is "current", reconstructed full with requester + status.
  assert((await countAllPlans(sb, requester.userId)) === 2, "countAllPlans sees both rows");
  const current = await loadCurrentPlanContext(sb, requester.userId);
  assert(current !== null, "loadCurrentPlanContext returns a plan");
  assert(current!.plan.planId === refinedId, `current is the newest plan (got ${current!.plan.planId})`);
  assert(current!.plan.activityType === "techno clubs", "current rehydrates the refined activity");
  assert(current!.plan.attendees.length > 0, "current rehydrates attendees");
  assert(current!.status === "ready", `current status ready (got ${current!.status})`);
  console.log(`Current plan: ${current!.plan.activityType} · ${current!.plan.attendees.length} attendees · ${current!.status}`);

  // Decline the first, assert it drops out of the active list (the row stays).
  await declinePlan(sb, id1);
  const afterDecline = requester.userId
    ? await listSummariesForPublicUser(sb, requester.userId)
    : [];
  assert(
    afterDecline.length === 1 && afterDecline[0].id === refinedId,
    `declined plan is hidden, refined one remains (got ${afterDecline.length})`,
  );
  const { count: rowCount } = await sb
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("created_for_user_id", requester.userId);
  assert(rowCount === 2, `declined row is kept, not deleted (got ${rowCount})`);
  console.log("Decline ok: hidden from list, row retained");

  // Clean up.
  await sb.from("plans").delete().eq("created_for_user_id", requester.userId);
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
      "id, activity_type, date_time, vibe, attendee_user_ids, confirmed_at, declined_at, places(name, neighborhood, type)",
    )
    .eq("created_for_user_id", publicUserId)
    .is("declined_at", null)
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
        declined_at: r.declined_at,
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
