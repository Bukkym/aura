import { createClient } from "../lib/supabase/admin";
import { generatePlan } from "../lib/generatePlan";
import { userFromRow } from "../lib/userRow";

// End-to-end check for the Plan generation pipeline. Picks Sofia as the
// host, runs generatePlan, and prints the result.
//
// Hits OpenAI for one embedding (venue query) + one chat completion
// (whyThisPlan) per run, so it costs real money. Don't loop it.
//
// Run with: npm run smoke:plan
//   (which wraps `tsx --env-file=.env.local scripts/smoke-plan.ts`)

const HOST_DISPLAY_NAME = "Sofia";

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
  console.log(
    `Host: ${host.displayName} [${host._archetype}] (id=${host.userId})\n`,
  );

  const t0 = Date.now();
  const plan = await generatePlan(sb, host);
  const ms = Date.now() - t0;

  const when = new Date(plan.dateTime);
  console.log(`Plan generated in ${ms}ms\n`);
  console.log(`  Activity:  ${plan.activityType.toUpperCase()}`);
  console.log(
    `  Venue:     ${plan.place.name} (${plan.place.type}, ${plan.place.neighborhood})`,
  );
  console.log(`  Time:      ${when.toUTCString()}`);
  console.log(`  Vibe:      ${plan.vibe.join(", ") || "(none)"}`);
  console.log(`\n  Attendees (${plan.attendees.length}):`);
  for (const a of plan.attendees) {
    const interests = a.selfExtracted.interests.slice(0, 3).join(", ");
    console.log(
      `    - ${a.displayName.padEnd(14)} [${a._archetype}]  ${interests}`,
    );
  }
  console.log(`\n  Why this Plan:\n    ${plan.whyThisPlan}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
