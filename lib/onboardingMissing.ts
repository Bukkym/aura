import type { LookingForExtracted, SelfExtracted } from "@/types";

// Pure completeness check for the onboarding voice agent (Phase 4). Given a
// profile extracted from free speech (lib/extract.ts), report which required
// fields still fall short, so the conversational loop knows what to ask next.
//
// The minimums mirror the CHIP-FLOW gate (components/aura/screens/onboarding.tsx
// STEPS), not the prose spec, because the chip flow is the real downstream
// contract: it is the prefilled confirm/edit surface and it will refuse to
// submit until each group meets its minimum. Asking for exactly what the chips
// demand keeps the two in sync. Fields the chip mapper MIRRORS from the self
// side (lookingFor.vibeKeywords / activityTypes / socialPreferences) are not
// asked separately; only their self-side source is required.

export interface ExtractedProfile {
  self: SelfExtracted;
  lookingFor: LookingForExtracted;
}

export interface MissingField {
  /** Machine id, e.g. "self.personality". */
  field: string;
  /** Human label for a coverage note, e.g. "a couple of words that describe you". */
  label: string;
  side: "self" | "lookingFor";
  have: number;
  need: number;
  /** A ready-made, natural follow-up the agent can ask (or rephrase). */
  question: string;
}

interface Requirement {
  field: string;
  side: "self" | "lookingFor";
  pick: (p: ExtractedProfile) => string[] | undefined;
  need: number;
  label: string;
  question: string;
}

// Order = priority. The loop asks about the earliest gaps first.
const REQUIREMENTS: Requirement[] = [
  {
    field: "self.personality",
    side: "self",
    pick: (p) => p.self.personality,
    need: 2,
    label: "a couple of words that describe you",
    question: "How would you describe yourself? A couple of words are plenty.",
  },
  {
    field: "self.vibeKeywords",
    side: "self",
    pick: (p) => p.self.vibeKeywords,
    need: 2,
    label: "your vibe",
    question: "What's your vibe on a normal week?",
  },
  {
    field: "self.interests",
    side: "self",
    pick: (p) => p.self.interests,
    need: 2,
    label: "what you're into",
    question: "What are you into? Name a couple of things.",
  },
  {
    field: "self.activityTypes",
    side: "self",
    pick: (p) => p.self.activityTypes,
    need: 1,
    label: "things you actually do",
    question: "What do you actually like to get out and do?",
  },
  {
    field: "self.neighborhoods",
    side: "self",
    pick: (p) => p.self.neighborhoods,
    need: 1,
    label: "where in Berlin you are",
    question: "Which part of Berlin are you around, or are you happy anywhere?",
  },
  {
    field: "self.availability",
    side: "self",
    pick: (p) => p.self.availability,
    need: 1,
    label: "when you're free",
    question: "When are you usually free to meet people?",
  },
  {
    field: "self.socialPreferences",
    side: "self",
    pick: (p) => p.self.socialPreferences,
    need: 1,
    label: "how you like to hang out",
    question: "How do you like to hang out? Small groups, one-on-one, low-key?",
  },
  {
    field: "lookingFor.connectionType",
    side: "lookingFor",
    pick: (p) => p.lookingFor.connectionType,
    need: 1,
    label: "the kind of connection you want",
    question:
      "What are you hoping to find: people to do things with, deeper friendships, a friend group, or help finding your footing here?",
  },
  {
    field: "lookingFor.personality",
    side: "lookingFor",
    pick: (p) => p.lookingFor.personality,
    need: 2,
    label: "the people you'd click with",
    question: "What kind of people would you click with?",
  },
  {
    field: "lookingFor.interests",
    side: "lookingFor",
    pick: (p) => p.lookingFor.interests,
    need: 1,
    label: "interests you'd want to share",
    question: "Any interests you'd want to share with the people you meet?",
  },
];

function countTags(tags: string[] | undefined): number {
  if (!tags) return 0;
  return tags.filter((t) => typeof t === "string" && t.trim().length > 0).length;
}

/** Required fields still below their minimum, in priority order. */
export function missingRequiredFields(profile: ExtractedProfile): MissingField[] {
  const out: MissingField[] = [];
  for (const r of REQUIREMENTS) {
    const have = countTags(r.pick(profile));
    if (have < r.need) {
      out.push({
        field: r.field,
        label: r.label,
        side: r.side,
        have,
        need: r.need,
        question: r.question,
      });
    }
  }
  return out;
}

export function isProfileComplete(profile: ExtractedProfile): boolean {
  return missingRequiredFields(profile).length === 0;
}
