import type { SupabaseClient } from "@supabase/supabase-js";
import type { Match, User } from "@/types";
import { canonAll, jaccard } from "./canon";

// Deterministic mutual-fit matching. No runtime AI (Module 3).
//
// We rank the seed pool against the requester by weighted Jaccard overlap on the
// structured chip arrays. At 175 users this runs in-process in a few ms, and
// keeping it in TS lets us canonicalize tag drift on read via lib/canon.ts.
// The numeric score is interpretable and feeds the "why this plan" copy.
//
// (The earlier embedding-based path via the match_users RPC is retired for
// Module 3; pgvector still backs match_places-style use if we want it later.)

// Weights for the mutual-fit score. Requester's "looking for" against the
// candidate's "self", with activity + vibe + social + connection + locale as
// supporting signal. Tuned so personality + interests dominate.
const W = {
  personality: 0.35,
  interests: 0.2,
  activityTypes: 0.15,
  vibeKeywords: 0.1,
  socialPreferences: 0.1,
  connectionType: 0.05,
  neighborhoods: 0.05,
} as const;

export interface RankedCandidate {
  user: User;
  score: number;
}

// Lightweight row shape: we deliberately do NOT select the 1536-dim embedding
// columns here (175 of them would be megabytes the deterministic path never
// uses). Attendee User objects are built with empty embeddings.
type LiteRow = {
  id: string;
  display_name: string;
  city: string;
  age_range_min: number | null;
  age_range_max: number | null;
  raw_inputs: User["rawInputs"];
  self_extracted: User["selfExtracted"];
  looking_for_extracted: User["lookingForExtracted"];
  archetype: string | null;
  created_at: string;
};

const LITE_COLUMNS =
  "id, display_name, city, age_range_min, age_range_max, raw_inputs, self_extracted, looking_for_extracted, archetype, created_at";

function userFromLiteRow(row: LiteRow): User {
  return {
    userId: row.id,
    displayName: row.display_name,
    city: row.city as "Berlin",
    ageRange:
      row.age_range_min !== null && row.age_range_max !== null
        ? { min: row.age_range_min, max: row.age_range_max }
        : undefined,
    createdAt: row.created_at,
    rawInputs: row.raw_inputs,
    selfExtracted: row.self_extracted,
    lookingForExtracted: row.looking_for_extracted,
    selfEmbedding: [],
    lookingForEmbedding: [],
    _archetype: row.archetype ?? undefined,
  };
}

// Mutual-fit score in [0,1]. Requester perspective: what the requester is looking for
// against who the candidate is, plus supporting overlaps. Requester fields fall
// back sensibly when an optional field is absent (e.g. lookingFor.activityTypes
// → self.activityTypes; neighborhoods → ["any"]).
export function scorePair(requester: User, cand: User): number {
  const hp = canonAll(requester.lookingForExtracted.personality);
  const hi = canonAll(requester.lookingForExtracted.interests);
  const ha = canonAll(
    requester.lookingForExtracted.activityTypes ?? requester.selfExtracted.activityTypes,
  );
  const hv = canonAll(requester.lookingForExtracted.vibeKeywords);
  const hs = canonAll(requester.lookingForExtracted.socialPreferences);
  const hc = canonAll(requester.lookingForExtracted.connectionType);
  const hn = canonAll(
    requester.lookingForExtracted.neighborhoods ?? requester.selfExtracted.neighborhoods,
  );

  const cp = canonAll(cand.selfExtracted.personality);
  const ci = canonAll(cand.selfExtracted.interests);
  const ca = canonAll(cand.selfExtracted.activityTypes);
  const cv = canonAll(cand.selfExtracted.vibeKeywords);
  const cs = canonAll(cand.selfExtracted.socialPreferences);
  const cc = canonAll(cand.lookingForExtracted.connectionType);
  const cn = canonAll(cand.selfExtracted.neighborhoods);

  // connection + neighborhood are binary "any overlap" signals.
  const connSet = new Set(cc);
  const connHit = hc.some((x) => connSet.has(x)) ? 1 : 0;
  const nbSet = new Set(cn);
  const nbHit =
    hn.length === 0 || hn.includes("any") || cn.includes("any")
      ? 0.5 // neutral when unspecified
      : hn.some((x) => nbSet.has(x))
        ? 1
        : 0;

  return (
    W.personality * jaccard(hp, cp) +
    W.interests * jaccard(hi, ci) +
    W.activityTypes * jaccard(ha, ca) +
    W.vibeKeywords * jaccard(hv, cv) +
    W.socialPreferences * jaccard(hs, cs) +
    W.connectionType * connHit +
    W.neighborhoods * nbHit
  );
}

// Rank the whole pool (everyone but the requester) by mutual-fit score, return the
// top k. Pass a large k from pickAttendees so downstream filters have room.
export async function rankSeedUsersForRequester(
  sb: SupabaseClient,
  requester: User,
  k: number,
): Promise<RankedCandidate[]> {
  const { data: rows, error } = await sb
    .from("users")
    .select(LITE_COLUMNS)
    .neq("id", requester.userId);

  if (error) {
    throw new Error(`Failed to load candidate pool: ${error.message}`);
  }

  return (rows ?? [])
    .map((r) => {
      const user = userFromLiteRow(r as LiteRow);
      return { user, score: scorePair(requester, user) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// Deterministic structured-overlap explanation, reused by the API response
// and the "why this plan" templates. Canonicalized so drift doesn't hide a
// real overlap.
export function explain(a: User, b: User): Match["explanations"] {
  const inter = (xs: string[] | undefined, ys: string[] | undefined) => {
    const ca = canonAll(xs);
    const setB = new Set(canonAll(ys));
    return ca.filter((x) => setB.has(x));
  };

  return {
    sharedInterests: inter(a.selfExtracted.interests, b.selfExtracted.interests),
    sharedActivityTypes: inter(
      a.selfExtracted.activityTypes,
      b.selfExtracted.activityTypes,
    ),
    sharedSocialPreferences: inter(
      a.selfExtracted.socialPreferences,
      b.selfExtracted.socialPreferences,
    ),
    sharedLifeContext: inter(
      a.selfExtracted.lifeContext,
      b.selfExtracted.lifeContext,
    ),
    matchedPersonalityTraits: inter(
      a.lookingForExtracted.personality,
      b.selfExtracted.personality,
    ),
  };
}
