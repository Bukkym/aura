import type { SupabaseClient } from "@supabase/supabase-js";
import type { Match, User } from "@/types";
import { findSimilarUsers } from "./findSimilar";
import { userFromRow } from "./userRow";

// Mutual-fit matching with explanations. See /technical/02-data-model.md.
//
// The numerical score is computed in Postgres via the `match_users` RPC —
// see lib/findSimilar.ts and the SQL function in
// supabase/migrations/20260518200707_match_functions.sql.
//
// The `explanations` block is computed here in TS: it operates on the JSONB
// `selfExtracted` / `lookingForExtracted` tag arrays after they're hydrated as
// objects, and exists to give the UI structured "why this match" tags
// ("Both into startups", "Both new to Berlin"). It is the explainability
// differentiator and intentionally deterministic.

export async function rankMatches(
  sb: SupabaseClient,
  query: User,
  k: number,
): Promise<Match[]> {
  const ranked = await findSimilarUsers(sb, query, k);
  if (ranked.length === 0) return [];

  // Hydrate the matched user rows so we can run explain() against their tags.
  // Public-read RLS on `users` means this works from any client.
  const matchedIds = ranked.map((r) => r.userId);
  const { data: rows, error } = await sb
    .from("users")
    .select(
      "id, display_name, city, age_range_min, age_range_max, raw_inputs, self_extracted, looking_for_extracted, self_embedding, looking_for_embedding, archetype, created_at",
    )
    .in("id", matchedIds);

  if (error) {
    throw new Error(`Failed to hydrate matched users: ${error.message}`);
  }

  const byId = new Map((rows ?? []).map((r) => [r.id as string, userFromRow(r)]));

  return ranked
    .map((r) => {
      const matched = byId.get(r.userId);
      if (!matched) return null;
      return {
        queryUserId: query.userId,
        matchedUserId: r.userId,
        score: r.score,
        explanations: explain(query, matched),
      } satisfies Match;
    })
    .filter((m): m is Match => m !== null);
}

function explain(a: User, b: User) {
  const intersect = (xs: string[], ys: string[]) =>
    xs.filter((x) => ys.includes(x));

  return {
    sharedInterests: intersect(
      a.selfExtracted.interests,
      b.selfExtracted.interests,
    ),
    sharedActivityTypes: intersect(
      a.selfExtracted.activityTypes,
      b.selfExtracted.activityTypes,
    ),
    sharedSocialPreferences: intersect(
      a.selfExtracted.socialPreferences,
      b.selfExtracted.socialPreferences,
    ),
    sharedLifeContext: intersect(
      a.selfExtracted.lifeContext,
      b.selfExtracted.lifeContext,
    ),
    matchedPersonalityTraits: intersect(
      a.lookingForExtracted.personality,
      b.selfExtracted.personality,
    ),
  };
}

// User-row mapping helpers live in lib/userRow.ts (shared with generatePlan).
