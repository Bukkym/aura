import type { SupabaseClient } from "@supabase/supabase-js";
import type { SelfExtracted } from "@/types";
import { canonAll } from "./canon";

// Cluster assignment. Every user belongs to one of the seed archetypes (the 7
// clusters: ambitious-creators, cultural-explorers, scene-nightlife,
// outdoor-active, wellness-inner-work, cozy-connectors, sports-crew). Seed users
// carry their archetype; real (chip-onboarded) users were getting NULL, so they
// sat outside the cluster system. This assigns the best-fitting archetype from a
// user's chips by tag overlap against each cluster's profile. Deterministic, no
// AI (Module 3), same canon vocab as the matcher.

const FIELDS = ["interests", "activityTypes", "personality", "vibeKeywords"] as const;
type Field = (typeof FIELDS)[number];

// interests + activities define the clusters (sports-crew, outdoor-active, ...);
// personality + vibe are softer secondary signals.
const FIELD_WEIGHTS: Record<Field, number> = {
  interests: 1,
  activityTypes: 1,
  personality: 0.5,
  vibeKeywords: 0.5,
};

export interface ArchetypeProfile {
  archetype: string;
  members: number;
  // canonical tag -> how many of the cluster's members carry it
  tagCounts: Record<Field, Map<string, number>>;
}

interface ArchetypeRow {
  archetype: string | null;
  self_extracted: SelfExtracted | null;
}

// Aggregate seed members into per-cluster tag-frequency profiles. Sorted by
// archetype name so downstream tie-breaks are deterministic.
export function buildArchetypeProfiles(rows: ArchetypeRow[]): ArchetypeProfile[] {
  const byArch = new Map<string, ArchetypeProfile>();
  for (const r of rows) {
    if (!r.archetype || !r.self_extracted) continue;
    let p = byArch.get(r.archetype);
    if (!p) {
      p = {
        archetype: r.archetype,
        members: 0,
        tagCounts: { interests: new Map(), activityTypes: new Map(), personality: new Map(), vibeKeywords: new Map() },
      };
      byArch.set(r.archetype, p);
    }
    p.members += 1;
    for (const f of FIELDS) {
      for (const tag of canonAll(r.self_extracted[f])) {
        p.tagCounts[f].set(tag, (p.tagCounts[f].get(tag) ?? 0) + 1);
      }
    }
  }
  return [...byArch.values()].sort((a, b) => a.archetype.localeCompare(b.archetype));
}

// How well a user's chips fit a cluster: for each field, the share of cluster
// members that carry each of the user's tags, summed and field-weighted.
// Normalizing by member count keeps clusters of different sizes comparable.
export function scoreArchetypeFit(self: SelfExtracted, profile: ArchetypeProfile): number {
  if (profile.members === 0) return 0;
  let score = 0;
  for (const f of FIELDS) {
    const counts = profile.tagCounts[f];
    let fieldHit = 0;
    for (const tag of canonAll(self[f])) {
      fieldHit += (counts.get(tag) ?? 0) / profile.members;
    }
    score += FIELD_WEIGHTS[f] * fieldHit;
  }
  return score;
}

// Pick the best-fitting archetype, or null when the user overlaps nothing.
export function assignArchetype(self: SelfExtracted, profiles: ArchetypeProfile[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const p of profiles) {
    const s = scoreArchetypeFit(self, p);
    if (s > bestScore) {
      bestScore = s;
      best = p.archetype;
    }
  }
  return best;
}

// DB wrapper: load the labeled (seed) users and build the cluster profiles.
export async function loadArchetypeProfiles(sb: SupabaseClient): Promise<ArchetypeProfile[]> {
  const { data, error } = await sb
    .from("users")
    .select("archetype, self_extracted")
    .not("archetype", "is", null);
  if (error) throw new Error(`Archetype profile load failed: ${error.message}`);
  return buildArchetypeProfiles((data ?? []) as ArchetypeRow[]);
}
