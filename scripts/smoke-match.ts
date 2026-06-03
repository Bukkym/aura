import { createClient } from "../lib/supabase/admin";
import { rankSeedUsersForHost, explain } from "../lib/match";
import { userFromRow } from "../lib/userRow";

// Deterministic matching smoke test (Module 3, no AI). Picks a known seed
// user (Sofia) as the host and ranks the pool by structured-overlap score,
// printing the shared-tag explanation per match.
//
// Run with: npm run smoke:match
//   (tsx --env-file=.env.local scripts/smoke-match.ts)

const HOST_DISPLAY_NAME = "Sofia";
const K = 6;

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
  const ranked = await rankSeedUsersForHost(sb, host, K);
  const ms = Date.now() - t0;

  console.log(`Top ${K} matches (deterministic, ${ms}ms, no AI):`);
  for (const { user, score } of ranked) {
    const exp = explain(host, user);
    const tags = [
      exp.sharedInterests.length && `interests: ${exp.sharedInterests.join(", ")}`,
      exp.sharedActivityTypes.length &&
        `activities: ${exp.sharedActivityTypes.join(", ")}`,
      exp.matchedPersonalityTraits.length &&
        `personality: ${exp.matchedPersonalityTraits.join(", ")}`,
    ]
      .filter(Boolean)
      .join("  |  ");
    console.log(
      `  ${score.toFixed(4)}  ${user.displayName.padEnd(14)} [${user._archetype}]`,
    );
    if (tags) console.log(`           ${tags}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
