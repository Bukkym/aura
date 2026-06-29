import { canon } from "./canon";
import type {
  Budget,
  ConnectionType,
  LookingForExtracted,
  SelfExtracted,
} from "@/types";

// Pure normalization for the LLM extraction pass (lib/extract.ts). The model
// reads free speech and proposes tags; this module is the deterministic gate
// between that proposal and the matcher. It does two jobs, both testable with
// no network:
//
//   1. parseExtractionJson — pull a JSON object out of the model's reply
//      (tolerating code fences and surrounding prose).
//   2. normalizeExtraction — canonicalize (lib/canon.ts) then CLAMP every tag
//      to the closed taxonomy in technical/05-onboarding-spec.md §3, dropping
//      anything the model invented. Real users must land in the SAME tag space
//      as the seed pool, or deterministic string-overlap matching scores zero.
//
// It deliberately does NOT inject the spec §5 skip-defaults. An unmentioned
// field stays empty so the onboarding agent (Phase 4, lib/onboardingMissing.ts)
// can see the gap and ask a follow-up. Filling blanks is a later, separate step.

// Closed picker vocabularies, copied verbatim from the onboarding spec §3.
// Ordering mirrors the spec (seed-frequency, most common first); it carries no
// meaning here beyond documentation.
export const VOCAB = {
  personality: [
    "curious", "open-minded", "adventurous", "creative", "thoughtful", "chill",
    "ambitious", "introverted", "extroverted", "enthusiastic", "easygoing",
    "passionate",
  ],
  vibe: [
    "chill", "creative", "cozy", "intellectual", "laid-back", "adventurous",
    "introspective", "underground", "artsy", "genuine", "deep", "explorative",
  ],
  interests: [
    "art", "music", "philosophy", "startups", "cycling", "climbing", "yoga",
    "cooking", "techno", "vinyl", "books", "design", "indie film", "outdoors",
    "food",
  ],
  activities: [
    "dinner parties", "gallery openings", "boulder gym", "lake days",
    "cycling tours", "indie cinema", "yoga studios", "museum afternoons",
    "breathwork circles", "techno clubs", "book clubs", "brunches", "hiking",
    "board game nights", "cafe work sessions",
  ],
  social: [
    "small-group", "one-on-one", "low-pressure", "spontaneous", "consistent",
    "intimate", "casual", "high-energy", "deep conversations", "lively",
  ],
  connectionType: [
    "activity-buddies", "close-friendships", "social-circle", "new-city-support",
  ],
  neighborhoods: [
    "Kreuzberg", "Mitte", "Prenzlauer Berg", "Wedding", "Friedrichshain",
    "Neukölln", "Tiergarten", "Charlottenburg", "Rummelsburg", "Moabit",
    "Schöneberg", "Tempelhof",
  ],
  availability: [
    "weekday evenings", "weekday mornings", "weekend mornings",
    "weekend afternoons", "weekend evenings", "weekends", "anytime",
  ],
  budget: ["low", "mid", "high", "any"],
} as const;

// Friendly connection-type labels the model may emit (it is shown these in the
// prompt) mapped back to the closed codes the schema stores.
const CONNECTION_LABELS: Record<string, ConnectionType> = {
  "people to do things with": "activity-buddies",
  "deep connections": "close-friendships",
  "a friend group": "social-circle",
  "help finding my footing here": "new-city-support",
  "new city support": "new-city-support",
};

// Loosely-typed shape of the parsed model reply. Every field is optional and
// untrusted; the normalizer treats anything non-array as absent.
export interface RawExtraction {
  self?: Record<string, unknown>;
  lookingFor?: Record<string, unknown>;
}

// Read a field as a string array, tolerating a single string or junk.
function arr(obj: Record<string, unknown> | undefined, ...keys: string[]): string[] {
  if (!obj) return [];
  for (const key of keys) {
    const v = obj[key];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (typeof v === "string" && v.trim()) return [v];
  }
  return [];
}

// Keep only tags whose canonical root matches a vocab entry's canonical root,
// then emit the vocab entry (the chip-flow representation) and dedupe. Keying
// by canon(entry) on BOTH sides matters: the matcher treats "dinner party" and
// "dinner parties" as equal via canon, but the closed chip vocab stores the
// plural; a plain lowercase compare would drop the model's singular phrasing.
function clampToVocab(tags: string[], allowed: readonly string[]): string[] {
  const byCanon = new Map(allowed.map((a) => [canon(a), a]));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    if (!raw) continue;
    const hit = byCanon.get(canon(raw));
    if (hit && !seen.has(hit)) {
      seen.add(hit);
      out.push(hit);
    }
  }
  return out;
}

// "Anywhere in Berlin" collapses to ["any"]; otherwise clamp to the closed
// neighborhood list. Empty in, empty out (no default here).
function normalizeNeighborhoods(tags: string[]): string[] {
  for (const raw of tags) {
    const c = canon(raw);
    if (c === "any" || c.startsWith("anywhere")) return ["any"];
  }
  return clampToVocab(tags, VOCAB.neighborhoods);
}

// Single-select budget. Returns undefined when the model said nothing usable,
// so the field stays absent rather than guessing.
function normalizeBudget(tags: string[]): Budget | undefined {
  for (const raw of tags) {
    const c = canon(raw);
    if ((VOCAB.budget as readonly string[]).includes(c)) return c as Budget;
  }
  return undefined;
}

function normalizeConnectionTypes(tags: string[]): ConnectionType[] {
  const mapped = tags.map((t) => CONNECTION_LABELS[canon(t)] ?? t);
  return clampToVocab(mapped, VOCAB.connectionType) as ConnectionType[];
}

/**
 * Map an untrusted parsed model reply onto the canonical chip schema, clamped
 * to the closed taxonomy. Never throws; missing or junk fields become empty
 * arrays. `lifeContext` is the one open field (no closed vocab in the spec), so
 * it is canonicalized but not clamped.
 */
export function normalizeExtraction(raw: RawExtraction): {
  self: SelfExtracted;
  lookingFor: LookingForExtracted;
} {
  const s = raw.self;
  const l = raw.lookingFor;

  const self: SelfExtracted = {
    personality: clampToVocab(arr(s, "personality"), VOCAB.personality),
    interests: clampToVocab(arr(s, "interests"), VOCAB.interests),
    activityTypes: clampToVocab(arr(s, "activityTypes", "activities"), VOCAB.activities),
    socialPreferences: clampToVocab(arr(s, "socialPreferences", "social"), VOCAB.social),
    lifeContext: dedupe(arr(s, "lifeContext").map((t) => canon(t)).filter(Boolean)),
    vibeKeywords: clampToVocab(arr(s, "vibeKeywords", "vibe"), VOCAB.vibe),
    availability: clampToVocab(arr(s, "availability"), VOCAB.availability),
    neighborhoods: normalizeNeighborhoods(arr(s, "neighborhoods")),
  };
  const budget = normalizeBudget(arr(s, "budget"));
  if (budget) self.budget = budget;

  const lookingFor: LookingForExtracted = {
    personality: clampToVocab(arr(l, "personality"), VOCAB.personality),
    interests: clampToVocab(arr(l, "interests"), VOCAB.interests),
    socialPreferences: clampToVocab(arr(l, "socialPreferences", "social"), VOCAB.social),
    vibeKeywords: clampToVocab(arr(l, "vibeKeywords", "vibe"), VOCAB.vibe),
    connectionType: normalizeConnectionTypes(arr(l, "connectionType", "connectionTypes")),
    activityTypes: clampToVocab(arr(l, "activityTypes", "activities"), VOCAB.activities),
    neighborhoods: normalizeNeighborhoods(arr(l, "neighborhoods")),
  };

  return { self, lookingFor };
}

function dedupe(tags: string[]): string[] {
  return Array.from(new Set(tags.filter(Boolean)));
}

/**
 * Pull a JSON object out of a model reply. Tolerates ```json fences and prose
 * around the object by taking the substring between the first "{" and the last
 * "}". Returns {} on any failure so the caller always gets a usable shape.
 */
export function parseExtractionJson(text: string): RawExtraction {
  if (!text) return {};
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return {};
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (parsed && typeof parsed === "object") return parsed as RawExtraction;
    return {};
  } catch {
    return {};
  }
}
