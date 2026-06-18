import type { SupabaseClient } from "@supabase/supabase-js";
import type { Place, Plan, User } from "@/types";
import { rankSeedUsersForHost } from "./match";
import { renderWhyTemplate } from "./whyTemplates";
import { canon, canonAll, overlaps } from "./canon";
import { parseVector } from "./userRow";

// Plan generation pipeline. Deterministic, no runtime AI (Module 3). See
// /technical/06-deterministic-matching.md.
//
//   1. pickActivity   — first entry from host.selfExtracted.activityTypes.
//   2. pickVenue      — score all places by activity-token + vibe + locale
//                       overlap, pick the best (random among ties).
//   3. pickTime       — activity-class → next occurrence.
//   4. pickAttendees  — rankSeedUsersForHost → filter by activity + availability
//                       → top k, with a relaxation cascade so we never return <k.
//   5. whyThisPlan    — templated copy from real shared tags (no LLM).

// 5 attendees + the host = a table of 6, sitting in the small-group sweet spot
// for actual conversation (see technical/08-future-considerations.md).
const TARGET_ATTENDEES = 5;
const ATTENDEE_CANDIDATE_PAD = 40;

const TIME_HINTS: ReadonlyArray<{
  pattern: RegExp;
  dayOfWeek: number;
  hour: number;
  label: string;
}> = [
  { pattern: /climb|boulder/i,            dayOfWeek: 6, hour: 11, label: "Saturday morning" },
  { pattern: /dinner|supper/i,            dayOfWeek: 5, hour: 19, label: "Friday evening" },
  { pattern: /brunch/i,                   dayOfWeek: 0, hour: 11, label: "Sunday late morning" },
  { pattern: /hike|trail|camping/i,       dayOfWeek: 0, hour: 9,  label: "Sunday morning" },
  { pattern: /gallery|art|exhibit/i,      dayOfWeek: 4, hour: 19, label: "Thursday evening" },
  { pattern: /techno|club|nightlife/i,    dayOfWeek: 6, hour: 23, label: "Saturday night" },
  { pattern: /yoga|wellness|meditation/i, dayOfWeek: 6, hour: 10, label: "Saturday morning" },
  { pattern: /cycling|bike/i,             dayOfWeek: 6, hour: 14, label: "Saturday afternoon" },
  { pattern: /lake|outdoor|park|garden/i, dayOfWeek: 6, hour: 14, label: "Saturday afternoon" },
  { pattern: /live music|concert|jazz/i,  dayOfWeek: 5, hour: 20, label: "Friday evening" },
  { pattern: /coffee|cafe/i,              dayOfWeek: 6, hour: 10, label: "Saturday morning" },
];

const DEFAULT_TIME = {
  dayOfWeek: 6,
  hour: 14,
  label: "Saturday afternoon",
} as const;

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

// Refinement knobs for "request another Plan": keep the same profile, but ask
// for a different activity, and/or exclude people who didn't fit so a new group
// is drawn. Both are optional; with neither set this is the original first-plan
// behavior.
export interface GeneratePlanOptions {
  k?: number;
  activityOverride?: string;
  excludeUserIds?: string[];
}

export async function generatePlan(
  sb: SupabaseClient,
  host: User,
  options: GeneratePlanOptions = {},
): Promise<Plan> {
  const { k = TARGET_ATTENDEES, activityOverride, excludeUserIds = [] } = options;
  const activity = pickActivity(host, activityOverride);

  const [venue, attendees] = await Promise.all([
    pickVenue(sb, host, activity),
    pickAttendees(sb, host, activity, k, excludeUserIds),
  ]);

  const { dateTime, label: timeLabel } = pickTime(activity);

  const whyThisPlan = renderWhyTemplate(
    host,
    attendees,
    activity,
    venue,
    timeLabel,
  );

  return {
    planId: crypto.randomUUID(),
    hostUserId: host.userId,
    activityType: activity,
    place: venue,
    dateTime,
    vibe: canonAll([
      ...host.selfExtracted.vibeKeywords,
      ...host.lookingForExtracted.vibeKeywords,
    ]).slice(0, 4),
    attendees,
    whyThisPlan,
  };
}

// ----------------------------------------------------------------------------
// Steps
// ----------------------------------------------------------------------------

function pickActivity(host: User, override?: string): string {
  const chosen = override?.trim();
  if (chosen) return chosen;
  const candidates = host.selfExtracted.activityTypes;
  if (candidates.length > 0) return candidates[0];
  const interest = host.selfExtracted.interests[0];
  if (interest) return `${interest} meetup`;
  return "casual hangout";
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Loose activity match between a free-text activity and a place's tags or a
// user's activityTypes: substring either direction, or a shared token. So
// "techno clubs" matches place tag "techno club" and user "clubbing".
function looseActivityMatch(activity: string, tags: string[]): boolean {
  const a = canon(activity);
  const aTokens = new Set(tokens(a));
  return canonAll(tags).some((t) => {
    if (t.includes(a) || a.includes(t)) return true;
    return tokens(t).some((tok) => aTokens.has(tok));
  });
}

async function pickVenue(
  sb: SupabaseClient,
  host: User,
  activity: string,
): Promise<Place> {
  const { data: rows, error } = await sb.from("places").select("*");
  if (error || !rows || rows.length === 0) {
    throw new Error(`Failed to load places: ${error?.message ?? "no places"}`);
  }

  const hostVibe = canonAll([
    ...host.selfExtracted.vibeKeywords,
    ...host.lookingForExtracted.vibeKeywords,
  ]);
  const hostNeighborhoods = canonAll(
    host.selfExtracted.neighborhoods ?? host.lookingForExtracted.neighborhoods,
  );

  type Scored = { row: (typeof rows)[number]; score: number };
  const scored: Scored[] = rows.map((row) => {
    const activityTags: string[] = row.activity_type_tags ?? [];
    const vibeTags = canonAll(row.vibe_tags ?? []);

    // activity-token overlap (the dominant signal)
    let score = 0;
    if (looseActivityMatch(activity, activityTags)) score += 2;

    // vibe overlap
    const vibeSet = new Set(vibeTags);
    const vibeHits = hostVibe.filter((v) => vibeSet.has(v)).length;
    score += vibeHits * 1.0;

    // neighborhood preference
    if (hostNeighborhoods.length === 0 || hostNeighborhoods.includes("any")) {
      score += 0.5;
    } else if (hostNeighborhoods.includes(canon(row.neighborhood))) {
      score += 1.5;
    }

    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If nothing scored on activity, fall back to the whole list so we still
  // return a venue (neighborhood/vibe-only ranking).
  const topScore = scored[0].score;
  const top =
    topScore > 0
      ? scored.filter((s) => s.score === topScore)
      : scored.slice(0, 5);

  // Deterministic-ish pick among ties by host id hash, so demos vary by user
  // but stay stable per user.
  const pickIdx = hashStr(host.userId) % top.length;
  const data = top[pickIdx].row;

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    neighborhood: data.neighborhood,
    activityTypeTags: data.activity_type_tags,
    vibeTags: data.vibe_tags,
    description: data.description,
    embedding: data.embedding ? parseVector(data.embedding) : [],
  };
}

function pickTime(activity: string): { dateTime: string; label: string } {
  const hint = TIME_HINTS.find((h) => h.pattern.test(activity)) ?? DEFAULT_TIME;
  return {
    dateTime: nextOccurrence(hint.dayOfWeek, hint.hour).toISOString(),
    label: hint.label,
  };
}

function nextOccurrence(targetDay: number, hour: number): Date {
  const now = new Date();
  const result = new Date(now);
  const currentDay = result.getDay();
  let daysAhead = (targetDay - currentDay + 7) % 7;
  if (daysAhead === 0 && now.getHours() >= hour) daysAhead = 7;
  result.setDate(result.getDate() + daysAhead);
  result.setHours(hour, 0, 0, 0);
  return result;
}

// "anytime" / "flexible" matches everything; otherwise require a shared window.
function availabilityOk(host: User, cand: User): boolean {
  const h = canonAll(host.selfExtracted.availability);
  const c = canonAll(cand.selfExtracted.availability);
  if (h.length === 0 || c.length === 0) return true;
  if (h.includes("anytime") || c.includes("anytime")) return true;
  if (h.includes("flexible") || c.includes("flexible")) return true;
  return overlaps(h, c);
}

async function pickAttendees(
  sb: SupabaseClient,
  host: User,
  activity: string,
  k: number,
  excludeUserIds: string[] = [],
): Promise<User[]> {
  const ranked = await rankSeedUsersForHost(sb, host, ATTENDEE_CANDIDATE_PAD);
  if (ranked.length === 0) return [];

  // Drop anyone the host asked to exclude (the "these people didn't fit" path),
  // so a refined Plan draws a different group.
  const exclude = new Set(excludeUserIds);
  const candidates = ranked.map((r) => r.user).filter((u) => !exclude.has(u.userId));

  const matchesActivity = (u: User) =>
    looseActivityMatch(activity, u.selfExtracted.activityTypes) ||
    looseActivityMatch(activity, u.lookingForExtracted.activityTypes ?? []);

  const sharesInterest = (u: User) =>
    overlaps(
      canonAll(host.selfExtracted.interests),
      canonAll(u.selfExtracted.interests),
    );

  // Tier 1: activity match AND availability overlap (the ideal group).
  let pool = candidates.filter(
    (u) => matchesActivity(u) && availabilityOk(host, u),
  );

  // Tier 2: activity OR shared-interest, ignore availability.
  if (pool.length < k) {
    pool = candidates.filter((u) => matchesActivity(u) || sharesInterest(u));
  }

  // Tier 3: anyone, ranked. Never return fewer than k when the pool allows.
  if (pool.length < k) {
    pool = candidates;
  }

  return pool.slice(0, k);
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
