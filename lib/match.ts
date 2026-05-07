import type { Match, User } from "@/types";
import { cosine } from "./findSimilar";

// Mutual-fit cosine matching. See /technical/02-data-model.md.
// score(A, B) = 0.5 * cos(A.lookingFor, B.self) + 0.5 * cos(B.lookingFor, A.self)
export function score(a: User, b: User): number {
  const aWants = cosine(a.lookingForEmbedding, b.selfEmbedding);
  const bWants = cosine(b.lookingForEmbedding, a.selfEmbedding);
  return 0.5 * aWants + 0.5 * bWants;
}

export function rankMatches(query: User, pool: User[], k: number): Match[] {
  return pool
    .filter((u) => u.userId !== query.userId)
    .map((u) => ({
      queryUserId: query.userId,
      matchedUserId: u.userId,
      score: score(query, u),
      explanations: explain(query, u),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function explain(a: User, b: User) {
  const intersect = (xs: string[], ys: string[]) =>
    xs.filter((x) => ys.includes(x));

  return {
    sharedInterests: intersect(
      a.selfExtracted.interests,
      b.selfExtracted.interests
    ),
    sharedActivityTypes: intersect(
      a.selfExtracted.activityTypes,
      b.selfExtracted.activityTypes
    ),
    sharedSocialPreferences: intersect(
      a.selfExtracted.socialPreferences,
      b.selfExtracted.socialPreferences
    ),
    sharedLifeContext: intersect(
      a.selfExtracted.lifeContext,
      b.selfExtracted.lifeContext
    ),
    matchedPersonalityTraits: intersect(
      a.lookingForExtracted.personality,
      b.selfExtracted.personality
    ),
  };
}
