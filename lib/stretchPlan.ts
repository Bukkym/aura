import type { SelfExtracted } from "@/types";
import { canon, canonAll } from "./canon";

// Module 4 M4.5: the "stretch moment". Ora offers ONE plan that gently pushes
// past the user's stated comfort zone, with an honest rationale.
//
// HONESTY CONSTRAINT (project rule + technical/09 scope): this build has NO
// behavioral learning, so we never claim "I've watched where you light up". The
// stretch is derived purely from what the user TOLD us at onboarding (their
// stated social preference) and is framed as a suggestion, not a certainty.
//
// The one axis we stretch today is group size: a user who said they like small,
// intimate groups is offered a bigger, more communal plan (a larger table around
// a communal activity). Everything here is pure and unit-tested; the route turns
// the angle into a real plan via generatePlan + narrateStretch.

// Stated preferences that read as "keeps it small".
const INTIMATE = new Set(["small-group", "one-on-one", "intimate", "low-pressure"]);

// Communal activities to stretch toward, each motivated by an interest so the
// suggestion feels anchored, not random. Ordered by how naturally communal.
const COMMUNAL: ReadonlyArray<{ activity: string; interests: string[] }> = [
  { activity: "dinner parties", interests: ["food", "cooking"] },
  { activity: "book clubs", interests: ["books"] },
  { activity: "gallery openings", interests: ["art", "design"] },
  { activity: "techno clubs", interests: ["techno", "music"] },
  { activity: "board game nights", interests: [] },
];

// A bigger table than the default of 5 (+ the requester = a table of 9).
const STRETCH_K = 8;

export interface StretchAngle {
  axis: "group-size";
  /** Attendee count override passed to generatePlan. */
  k: number;
  /** A more communal activity than the user's usual, fed to generatePlan. */
  activityOverride: string;
  /** Card copy: what the user's stated preference is. */
  usualLabel: string;
  /** Card copy: what this plan offers instead. */
  thisLabel: string;
  /** Honest, stated-preference reason (no behavioral claim). */
  reason: string;
}

/**
 * Decide whether a stretch is appropriate from the user's STATED preferences,
 * and if so, how to stretch. Returns null when there is no clear stretch (e.g.
 * the user already said they like big, lively groups), so the caller skips it.
 */
export function detectStretch(self: SelfExtracted): StretchAngle | null {
  const social = new Set(canonAll(self.socialPreferences));
  const prefersIntimate = [...INTIMATE].some((s) => social.has(s));
  if (!prefersIntimate) return null;

  const interests = new Set(canonAll(self.interests));
  const currentActivity = canonAll(self.activityTypes)[0] ?? "";

  // Prefer a communal activity motivated by one of their interests and
  // different from what they already do; otherwise any communal activity that
  // differs; otherwise the first.
  const chosen =
    COMMUNAL.find(
      (c) =>
        c.interests.some((i) => interests.has(i)) &&
        canon(c.activity) !== currentActivity,
    ) ??
    COMMUNAL.find((c) => canon(c.activity) !== currentActivity) ??
    COMMUNAL[0];

  return {
    axis: "group-size",
    k: STRETCH_K,
    activityOverride: chosen.activity,
    usualLabel: "Small tables, just a few faces.",
    thisLabel: `A bigger table, ${STRETCH_K + 1} seats.`,
    reason: "you told me you like it small",
  };
}

/**
 * Deterministic, honest fallback line for the stretch narration (used when the
 * LLM call errors or times out). Suggestion-framed, no behavioral claim, no em
 * dashes.
 */
export function stretchFallbackLine(
  angle: StretchAngle,
  activity: string,
  venueName: string,
): string {
  return (
    `You told me you like it small, so I almost held this one back. ` +
    `It seats ${angle.k + 1}, gathered for ${activity} at ${venueName}. ` +
    `Ora thinks a bigger table could click for you, worth a try.`
  );
}
