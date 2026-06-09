// Maps the 6-step onboarding chip selections onto the data model the
// deterministic matcher consumes (SelfExtracted + LookingForExtracted, the
// `aura:draft` contract that /plan POSTs to /api/plan/create).
//
// Why the mirroring matters: lib/match.ts scores host.lookingFor.* against
// cand.self.*, weighting personality .35 / interests .20 / activity .15 /
// vibe .10 / social .10 / connection .05 / hood .05. The onboarding flow only
// asks "your vibe" and "how you'd hang" once (about you), so we mirror those
// into lookingFor.vibeKeywords / lookingFor.socialPreferences, otherwise those
// two signals would score zero for every candidate. All tokens are vocab the
// flow shares with the seed pool; canon.ts collapses the remaining drift.

import type {
  Budget,
  ConnectionType,
  LookingForExtracted,
  SelfExtracted,
} from "@/types";

export type Selections = Record<string, string[]>;

export interface Draft {
  selfExtracted: SelfExtracted;
  lookingForExtracted: LookingForExtracted;
}

// Onboarding connection labels → the closed ConnectionType set.
const CONNECTION_MAP: Record<string, ConnectionType> = {
  "people to do things with": "activity-buddies",
  "deep connections": "close-friendships",
  "a friend group": "social-circle",
  "help finding my footing here": "new-city-support",
};

const BUDGETS: Budget[] = ["low", "mid", "high", "any"];

function neighborhoods(hoods: string[] | undefined): string[] {
  const picks = hoods ?? [];
  if (picks.length === 0 || picks.includes("Anywhere in Berlin")) return ["any"];
  return picks;
}

function budget(b: string[] | undefined): Budget {
  const v = (b ?? [])[0];
  return v && (BUDGETS as string[]).includes(v) ? (v as Budget) : "any";
}

export function mapSelectionsToDraft(sel: Selections): Draft {
  const hoods = neighborhoods(sel.h1);

  // "help finding my footing here" is a life-context signal too — surfacing it
  // lets explain() find shared "new to Berlin" with seed newcomers.
  const lifeContext = (sel.c1 ?? []).includes("help finding my footing here")
    ? ["new to Berlin"]
    : [];

  const connectionType = (sel.c1 ?? [])
    .map((label) => CONNECTION_MAP[label])
    .filter((c): c is ConnectionType => Boolean(c));

  const selfExtracted: SelfExtracted = {
    personality: sel.p1 ?? [],
    interests: sel.in1 ?? [],
    activityTypes: sel.ac1 ?? [],
    socialPreferences: sel.s1 ?? [],
    lifeContext,
    vibeKeywords: sel.v1 ?? [],
    availability: sel.av1 ?? [],
    neighborhoods: hoods,
    budget: budget(sel.b1),
  };

  const lookingForExtracted: LookingForExtracted = {
    personality: sel.p2 ?? [],
    interests: sel.in2 ?? [],
    // Mirror the user's own social style + vibe as what they want around them,
    // so match.ts's vibe (.10) and social (.10) weights actually fire.
    socialPreferences: sel.s1 ?? [],
    vibeKeywords: sel.v1 ?? [],
    connectionType,
    activityTypes: sel.ac1 ?? [],
    neighborhoods: hoods,
  };

  return { selfExtracted, lookingForExtracted };
}
