import type { SupabaseClient } from "@supabase/supabase-js";
import type { Place, Plan, User } from "@/types";
import { findSimilarPlaces, findSimilarUsers } from "./findSimilar";
import { embed } from "./embed";
import { openai, MODELS } from "./openai";
import { userFromRow, parseVector } from "./userRow";

// Plan generation pipeline. See /technical/02-data-model.md.
//
// Five steps, chained:
//   1. pickActivity   — first non-empty entry from host.selfExtracted.activityTypes
//                        (falls back to interests, then a sensible default).
//   2. pickVenue      — embed "<activity> + host vibe", call match_places, hydrate top hit.
//   3. pickTime       — deterministic day/hour mapping per activity class, next occurrence.
//   4. pickAttendees  — match_users(host) → pad of ~24 → filter by activity overlap → top k.
//                        Falls back to top k of unfiltered candidates if the filter is too strict.
//   5. whyThisPlan    — single LLM call, 1-2 sentences in Ora's voice.
//
// Per the MVP simplification in 02-data-model.md, we don't optimize for
// group-internal cohesion yet — that's a Phase 2 concern.

const TARGET_ATTENDEES = 6;
const ATTENDEE_CANDIDATE_PAD = 24;

// Activity-class → next occurrence. First pattern that matches wins, otherwise
// the default (Saturday afternoon). Day-of-week is 0 = Sunday … 6 = Saturday.
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

export async function generatePlan(
  sb: SupabaseClient,
  host: User,
  k: number = TARGET_ATTENDEES,
): Promise<Plan> {
  const activity = pickActivity(host);

  // Venue + attendees both hit the DB; run in parallel.
  const [venue, attendees] = await Promise.all([
    pickVenue(sb, host, activity),
    pickAttendees(sb, host, activity, k),
  ]);

  const { dateTime, label: timeLabel } = pickTime(activity);

  const whyThisPlan = await generateWhyThisPlan(
    host,
    activity,
    venue,
    timeLabel,
    attendees,
  );

  return {
    planId: crypto.randomUUID(),
    hostUserId: host.userId,
    activityType: activity,
    place: venue,
    dateTime,
    vibe: [
      ...host.selfExtracted.vibeKeywords,
      ...host.lookingForExtracted.vibeKeywords,
    ].slice(0, 4),
    attendees,
    whyThisPlan,
  };
}

// ----------------------------------------------------------------------------
// Steps
// ----------------------------------------------------------------------------

function pickActivity(host: User): string {
  const candidates = host.selfExtracted.activityTypes;
  if (candidates.length > 0) return candidates[0];
  const interest = host.selfExtracted.interests[0];
  if (interest) return `${interest} meetup`;
  return "casual hangout";
}

async function pickVenue(
  sb: SupabaseClient,
  host: User,
  activity: string,
): Promise<Place> {
  // Query embedding: the chosen activity plus the host's vibe keywords. We
  // intentionally do not embed the host's full self/looking-for — that pulls
  // people-flavored signal into a place query and noises up the result.
  const queryText = [
    activity,
    ...host.selfExtracted.vibeKeywords,
    ...host.lookingForExtracted.vibeKeywords,
  ]
    .filter(Boolean)
    .join(", ");

  const queryEmbedding = await embed(queryText || activity);
  const matches = await findSimilarPlaces(sb, queryEmbedding, 3);
  if (matches.length === 0) {
    throw new Error("No venues returned from match_places");
  }

  const top = matches[0];
  const { data, error } = await sb
    .from("places")
    .select("*")
    .eq("id", top.placeId)
    .single();
  if (error || !data) {
    throw new Error(`Failed to hydrate venue ${top.placeId}: ${error?.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    neighborhood: data.neighborhood,
    activityTypeTags: data.activity_type_tags,
    vibeTags: data.vibe_tags,
    description: data.description,
    embedding: parseVector(data.embedding),
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
  // If it's the target day but we're already past the target hour, push to next week.
  if (daysAhead === 0 && now.getHours() >= hour) daysAhead = 7;
  result.setDate(result.getDate() + daysAhead);
  result.setHours(hour, 0, 0, 0);
  return result;
}

async function pickAttendees(
  sb: SupabaseClient,
  host: User,
  activity: string,
  k: number,
): Promise<User[]> {
  const ranked = await findSimilarUsers(sb, host, ATTENDEE_CANDIDATE_PAD);
  if (ranked.length === 0) return [];

  const { data: rows, error } = await sb
    .from("users")
    .select("*")
    .in(
      "id",
      ranked.map((c) => c.userId),
    );
  if (error || !rows) {
    throw new Error(`Failed to hydrate attendee candidates: ${error?.message}`);
  }

  const byId = new Map(rows.map((r) => [r.id as string, userFromRow(r)]));
  const candidatesInOrder = ranked
    .map((c) => byId.get(c.userId))
    .filter((u): u is User => u !== undefined);

  // Activity overlap: case-insensitive substring either direction, or shared
  // tokens. Loose by design — exact-match would discard "boulder gym" against
  // user "boulder gym climbing" and we want those to match.
  const activityLower = activity.toLowerCase();
  const activityTokens = new Set(
    activityLower.split(/\s+/).filter((w) => w.length > 2),
  );
  function matchesActivity(u: User): boolean {
    return u.selfExtracted.activityTypes.some((at) => {
      const atLower = at.toLowerCase();
      if (atLower.includes(activityLower)) return true;
      if (activityLower.includes(atLower)) return true;
      const atTokens = atLower.split(/\s+/);
      return atTokens.some((t) => activityTokens.has(t));
    });
  }

  const filtered = candidatesInOrder.filter(matchesActivity);
  const pool = filtered.length >= k ? filtered : candidatesInOrder;
  return pool.slice(0, k);
}

async function generateWhyThisPlan(
  host: User,
  activity: string,
  venue: Place,
  timeLabel: string,
  attendees: User[],
): Promise<string> {
  const attendeeSketches = attendees
    .map((a) => {
      const interests = a.selfExtracted.interests.slice(0, 2).join(", ");
      return interests
        ? `${a.displayName} (${interests})`
        : a.displayName;
    })
    .join(", ");

  const hostConnectionType =
    host.lookingForExtracted.connectionType.join(", ") || "good people";
  const hostPersonality =
    host.selfExtracted.personality.join(", ") || "varied";

  const completion = await openai.chat.completions.create({
    model: MODELS.chat,
    messages: [
      {
        role: "system",
        content:
          "You are Ora, the social intelligence inside Aura. Speak warmly and directly. Output exactly 1 to 2 sentences. No hedging, no emojis, no em dashes, no headers, no quotation marks around the response.",
      },
      {
        role: "user",
        content: [
          `Host: ${host.displayName}.`,
          `Host personality: ${hostPersonality}. Looking for: ${hostConnectionType}.`,
          `Activity: ${activity}.`,
          `Venue: ${venue.name} in ${venue.neighborhood}.`,
          `Time: ${timeLabel}.`,
          `Attendees: ${attendeeSketches}.`,
          ``,
          `Write 1 to 2 sentences explaining why this Plan fits the host. Concrete, warm, no hedging.`,
        ].join("\n"),
      },
    ],
    temperature: 0.7,
  });

  return completion.choices[0].message.content?.trim() ?? "";
}
