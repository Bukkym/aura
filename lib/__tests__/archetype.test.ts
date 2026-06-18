import { describe, it, expect } from "vitest";
import { buildArchetypeProfiles, scoreArchetypeFit, assignArchetype } from "../archetype";
import { canon } from "../canon";
import type { SelfExtracted } from "@/types";

function self(o: Partial<SelfExtracted> = {}): SelfExtracted {
  return {
    personality: [],
    interests: [],
    activityTypes: [],
    socialPreferences: [],
    lifeContext: [],
    vibeKeywords: [],
    ...o,
  };
}

const rows = [
  { archetype: "outdoor-active", self_extracted: self({ interests: ["climbing", "outdoors"], activityTypes: ["hiking"] }) },
  { archetype: "outdoor-active", self_extracted: self({ interests: ["outdoors", "cycling"], activityTypes: ["hiking", "lake days"] }) },
  { archetype: "cultural-explorers", self_extracted: self({ interests: ["art", "indie film"], activityTypes: ["gallery openings"] }) },
  { archetype: "cultural-explorers", self_extracted: self({ interests: ["art", "books"], activityTypes: ["museum afternoons"] }) },
  { archetype: null, self_extracted: self({ interests: ["art"] }) }, // skipped: no archetype
  { archetype: "cultural-explorers", self_extracted: null }, // skipped: no chips
];

describe("buildArchetypeProfiles()", () => {
  const profiles = buildArchetypeProfiles(rows);
  it("groups by archetype, counts members, skips null rows, sorts by name", () => {
    expect(profiles.map((p) => p.archetype)).toEqual(["cultural-explorers", "outdoor-active"]);
    const cult = profiles.find((p) => p.archetype === "cultural-explorers")!;
    expect(cult.members).toBe(2);
    expect(cult.tagCounts.interests.get(canon("art"))).toBe(2);
  });
});

describe("assignArchetype()", () => {
  const profiles = buildArchetypeProfiles(rows);
  it("assigns the best-fitting cluster", () => {
    expect(assignArchetype(self({ interests: ["art"], activityTypes: ["gallery openings"] }), profiles)).toBe("cultural-explorers");
    expect(assignArchetype(self({ interests: ["outdoors"], activityTypes: ["hiking"] }), profiles)).toBe("outdoor-active");
  });
  it("returns null when nothing overlaps", () => {
    expect(assignArchetype(self({ interests: ["astrophysics"] }), profiles)).toBeNull();
  });
});

describe("scoreArchetypeFit()", () => {
  const profiles = buildArchetypeProfiles(rows);
  it("scores the matching cluster higher", () => {
    const cult = profiles.find((p) => p.archetype === "cultural-explorers")!;
    const out = profiles.find((p) => p.archetype === "outdoor-active")!;
    const u = self({ interests: ["art", "books"] });
    expect(scoreArchetypeFit(u, cult)).toBeGreaterThan(scoreArchetypeFit(u, out));
  });
  it("is zero against an empty profile", () => {
    const empty = { archetype: "x", members: 0, tagCounts: { interests: new Map(), activityTypes: new Map(), personality: new Map(), vibeKeywords: new Map() } };
    expect(scoreArchetypeFit(self({ interests: ["art"] }), empty)).toBe(0);
  });
});
