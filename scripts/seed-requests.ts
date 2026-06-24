import { createClient } from "../lib/supabase/admin";
import { generatePlan } from "../lib/generatePlan";
import { persistPlan } from "../lib/plans";
import { userFromRow } from "../lib/userRow";
import type { SupabaseClient } from "@supabase/supabase-js";

// Seed active plan requests for the mock pool.
//
// Aura is pool-based: every plan participant is a requester. A person requests
// the kind of activity they want, the system generates the plan, and they join
// it; nobody is a passive attendee. The 175 seed users had rich personalities
// but no requests, so the pool was inert. This gives each seed user
// (auth_user_id IS NULL) an active plan request, its own generated plan, so the
// pool is made of real requesters: it matches the model, gives a fresh real user
// a populated and believable pool to be matched against, and is the substrate
// for the synthetic-users testing direction (technical/08-future-considerations.md
// section 2).
//
// Idempotent: a seed user who already has an upcoming, non-declined plan is
// skipped. generatePlan is deterministic per host, so persistPlan would dedupe
// anyway; skipping just avoids the work.
//
// Real authed users (auth_user_id NOT NULL) are never touched. Note: re-running
// the JSON migrate script (npm run migrate:json-to-db) wipes all plans, so
// re-run this afterwards to repopulate the pool.
//
// Run with: npm run seed:requests           (all seed users)
//           npm run seed:requests -- 30      (cap to the first 30, for a quick pass)

// Each generatePlan does two lite DB reads (places + candidate pool), so a
// modest fan-out keeps the full 175-user pass to well under a minute without
// hammering the connection pool.
const CONCURRENCY = 8;

async function hasActivePlan(sb: SupabaseClient, hostUserId: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data, error } = await sb
    .from("plans")
    .select("id")
    .eq("host_user_id", hostUserId)
    .is("declined_at", null)
    .gte("date_time", nowIso)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Active-plan check failed: ${error.message}`);
  return Boolean(data);
}

async function main() {
  const sb = createClient();

  const limitArg = Number(process.argv[2]);
  const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : undefined;

  const { data: rows, error } = await sb
    .from("users")
    .select("*")
    .is("auth_user_id", null);
  if (error) throw new Error(`Failed to load seed users: ${error.message}`);

  let seedUsers = (rows ?? []).map(userFromRow);
  if (limit) seedUsers = seedUsers.slice(0, limit);

  console.log(
    `Seeding plan requests for ${seedUsers.length} seed users (concurrency ${CONCURRENCY})...`,
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < seedUsers.length; i += CONCURRENCY) {
    const chunk = seedUsers.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (host) => {
        try {
          if (await hasActivePlan(sb, host.userId)) {
            skipped++;
            return;
          }
          const plan = await generatePlan(sb, host);
          await persistPlan(sb, plan);
          created++;
        } catch (err) {
          failed++;
          console.error(
            `  ✗ ${host.displayName} (${host.userId}): ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
    console.log(`  ${Math.min(i + CONCURRENCY, seedUsers.length)}/${seedUsers.length} processed`);
  }

  console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}`);

  const { count, error: countErr } = await sb
    .from("plans")
    .select("*", { count: "exact", head: true });
  if (!countErr) console.log(`Total plans in DB: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
