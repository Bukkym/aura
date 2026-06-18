import type { Place, User } from "@/types";
import { canonAll } from "./canon";

// Deterministic "why this plan" copy. No LLM (Module 3). We pull the real
// shared tags across the host + attendees and slot them into one of a few
// templates, chosen by a stable hash of (host id, plan date) so a given user
// sees a consistent reason across refreshes. Empty slots drop their clause
// rather than print a placeholder.
//
// Module 4 will add lib/whyNarrate.ts (an LLM call on the same inputs) that
// falls back to these templates on error or timeout.

// Most common canonical tag across a set of members for a given field.
function topShared(
  members: User[],
  pick: (u: User) => string[] | undefined,
): string | null {
  const counts = new Map<string, number>();
  for (const m of members) {
    for (const tag of canonAll(pick(m))) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 1; // require at least 2 members sharing it
  for (const [tag, n] of counts) {
    if (n > bestCount) {
      best = tag;
      bestCount = n;
    }
  }
  return best;
}

function firstName(displayName: string): string {
  return displayName.split(/\s+/)[0] ?? displayName;
}

// FNV-1a, deterministic across runs (no Math.random / Date.now).
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function renderWhyTemplate(
  host: User,
  attendees: User[],
  activity: string,
  venue: Place,
  timeLabel: string,
): string {
  const members = [host, ...attendees];
  const sharedInterest = topShared(members, (u) => u.selfExtracted.interests);
  const sharedVibe = topShared(members, (u) => u.selfExtracted.vibeKeywords);
  const names = attendees.slice(0, 3).map((a) => firstName(a.displayName));

  // A secondary activity some attendees also picked (beyond the chosen one).
  const secondaryActivity = topShared(
    attendees,
    (u) => u.selfExtracted.activityTypes,
  );

  const lower = timeLabel.toLowerCase();
  const venueName = venue.name;

  // Rich templates that depend on shared tags. Built only when their slots
  // are filled, so we never print "into undefined".
  const rich: string[] = [];

  if (sharedInterest && sharedVibe) {
    rich.push(
      `A small table Ora paired around a ${sharedVibe} leaning and ${sharedInterest}, meeting for ${activity} at ${venueName} on ${lower}.` +
        secondNamesClause(names, secondaryActivity),
    );
  }
  if (sharedVibe) {
    rich.push(
      `${capitalize(activity)} at ${venueName}, ${lower}. Ora leaned on a shared ${sharedVibe} thread` +
        (sharedInterest ? ` and an interest in ${sharedInterest}.` : ".") +
        secondNamesClause(names, secondaryActivity),
    );
  }
  if (sharedInterest) {
    const hostVibe = canonAll(host.selfExtracted.vibeKeywords)[0];
    rich.push(
      `You picked ${hostVibe ? `${hostVibe} and ` : ""}${sharedInterest}. So did ${joinNames(names)}. Meeting at ${venueName} for ${activity}, ${lower}.`,
    );
  }

  // Prefer a rich template (chosen by stable hash for per-user variety). Only
  // fall back to the tagless sentence when there's no shared signal at all.
  if (rich.length > 0) {
    const idx = hashString(`${host.userId}:${activity}`) % rich.length;
    return rich[idx];
  }

  return `${capitalize(activity)} at ${venueName}, ${lower}, with ${attendees.length} people Ora thought you'd enjoy.`;
}

function secondNamesClause(
  names: string[],
  secondaryActivity: string | null,
): string {
  if (names.length === 0 || !secondaryActivity) return "";
  const who = names.length >= 2 ? `${names[0]} and ${names[1]}` : names[0];
  return ` ${who} also picked ${secondaryActivity}.`;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "others here";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]}, and ${names[2]}`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
