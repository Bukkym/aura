import { createClient } from "../lib/supabase/admin";
import { findSimilarPlaces } from "../lib/findSimilar";
import { rankMatches } from "../lib/match";
import type { User } from "../types";

// End-to-end regression check for the pgvector matching layer:
//   1) Pick a known seed user as the query (Sofia, an ambitious-creator).
//   2) Run rankMatches → exercises match_users RPC + user hydration + explain().
//   3) Run findSimilarPlaces against Sofia's lookingFor embedding → exercises
//      match_places RPC.
//
// Bypasses RLS via the admin client because this is a script, not user code.
//
// Run with: npm run smoke:match
//   (which wraps `tsx --env-file=.env.local scripts/smoke-match.ts`)

const QUERY_DISPLAY_NAME = "Sofia";
const K = 5;

async function main() {
  const sb = createClient();

  // --- Fetch the query user as a User object ------------------------------

  const { data: row, error: rowErr } = await sb
    .from("users")
    .select("*")
    .eq("display_name", QUERY_DISPLAY_NAME)
    .limit(1)
    .maybeSingle();

  if (rowErr) throw new Error(`Failed to load query user: ${rowErr.message}`);
  if (!row) throw new Error(`No seed user found with display_name=${QUERY_DISPLAY_NAME}`);

  const query: User = {
    userId: row.id,
    displayName: row.display_name,
    city: row.city,
    ageRange:
      row.age_range_min !== null && row.age_range_max !== null
        ? { min: row.age_range_min, max: row.age_range_max }
        : undefined,
    createdAt: row.created_at,
    rawInputs: row.raw_inputs,
    selfExtracted: row.self_extracted,
    lookingForExtracted: row.looking_for_extracted,
    selfEmbedding: parseVector(row.self_embedding),
    lookingForEmbedding: parseVector(row.looking_for_embedding),
    _archetype: row.archetype ?? undefined,
  };

  console.log(
    `Query user: ${query.displayName} [${query._archetype}] (id=${query.userId})\n`,
  );

  // --- rankMatches (mutual-fit users) -------------------------------------

  console.log(`Top ${K} user matches (mutual-fit, via match_users RPC):`);
  const matches = await rankMatches(sb, query, K);
  if (matches.length === 0) {
    console.log("  (no matches returned)");
  } else {
    for (const m of matches) {
      const { data: matched } = await sb
        .from("users")
        .select("display_name, archetype")
        .eq("id", m.matchedUserId)
        .single();
      const exp = m.explanations;
      const tags = [
        exp.sharedInterests.length && `interests: ${exp.sharedInterests.join(", ")}`,
        exp.sharedActivityTypes.length && `activities: ${exp.sharedActivityTypes.join(", ")}`,
        exp.matchedPersonalityTraits.length &&
          `personality: ${exp.matchedPersonalityTraits.join(", ")}`,
      ]
        .filter(Boolean)
        .join("  |  ");
      console.log(
        `  ${m.score.toFixed(4)}  ${matched?.display_name?.padEnd(14)} [${matched?.archetype}]`,
      );
      if (tags) console.log(`           ${tags}`);
    }
  }

  // --- findSimilarPlaces (one-sided) --------------------------------------

  console.log(`\nTop ${K} place matches (one-sided, via match_places RPC):`);
  const places = await findSimilarPlaces(sb, query.lookingForEmbedding, K);
  if (places.length === 0) {
    console.log("  (no places returned)");
  } else {
    for (const p of places) {
      const { data: place } = await sb
        .from("places")
        .select("name, neighborhood, type")
        .eq("id", p.placeId)
        .single();
      console.log(
        `  ${p.score.toFixed(4)}  ${place?.name?.padEnd(28)} [${place?.type}, ${place?.neighborhood}]`,
      );
    }
  }
}

function parseVector(v: string | number[]): number[] {
  if (Array.isArray(v)) return v;
  return JSON.parse(v);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
