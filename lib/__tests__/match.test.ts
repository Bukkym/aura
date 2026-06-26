import { describe, it, expect } from "vitest";
import { scorePair, explain } from "../match";
import type { User } from "@/types";

// Minimal User factory. Only the extracted-tag fields drive scoring/explain;
// embeddings and raw inputs are irrelevant to the deterministic path.
function mkUser(over: {
  id?: string;
  self?: Partial<User["selfExtracted"]>;
  lookingFor?: Partial<User["lookingForExtracted"]>;
}): User {
  return {
    userId: over.id ?? "u",
    displayName: "Test",
    city: "Berlin",
    createdAt: "2026-01-01T00:00:00.000Z",
    rawInputs: { selfDescription: "", lookingFor: "" },
    selfExtracted: {
      personality: [],
      interests: [],
      activityTypes: [],
      socialPreferences: [],
      lifeContext: [],
      vibeKeywords: [],
      neighborhoods: [],
      ...over.self,
    },
    lookingForExtracted: {
      personality: [],
      interests: [],
      socialPreferences: [],
      vibeKeywords: [],
      connectionType: [],
      ...over.lookingFor,
    },
    selfEmbedding: [],
    lookingForEmbedding: [],
  };
}

describe("scorePair()", () => {
  it("returns a higher score for a candidate who matches what the requester wants", () => {
    const requester = mkUser({
      id: "r",
      lookingFor: { personality: ["chill"], interests: ["techno"] },
    });
    const strong = mkUser({
      id: "a",
      self: { personality: ["chill"], interests: ["techno"] },
    });
    const weak = mkUser({
      id: "b",
      self: { personality: ["ambitious"], interests: ["opera"] },
    });

    expect(scorePair(requester, strong)).toBeGreaterThan(
      scorePair(requester, weak),
    );
  });

  it("scores entirely-disjoint users at or near zero on the weighted fields", () => {
    const requester = mkUser({
      id: "r",
      lookingFor: { personality: ["chill"], interests: ["techno"] },
    });
    const opposite = mkUser({
      id: "b",
      self: { personality: ["ambitious"], interests: ["opera"] },
    });
    // No overlap on any weighted field, neighborhoods unspecified -> 0.5 * 0.05.
    expect(scorePair(requester, opposite)).toBeLessThan(0.05);
  });

  it("canonicalizes drift variants before comparing, so they still match", () => {
    const requester = mkUser({
      id: "r",
      lookingFor: { personality: ["easy-going"] },
    });
    const canonical = mkUser({ id: "a", self: { personality: ["easygoing"] } });
    const literal = mkUser({ id: "b", self: { personality: ["easy-going"] } });
    // "easy-going" and "easygoing" canonicalize to the same tag.
    expect(scorePair(requester, canonical)).toBe(scorePair(requester, literal));
    expect(scorePair(requester, canonical)).toBeGreaterThan(0);
  });

  it("never exceeds 1 even on a perfect overlap across every field", () => {
    const tags = {
      personality: ["chill"],
      interests: ["techno"],
      vibeKeywords: ["warm"],
      socialPreferences: ["small-group"],
    };
    const requester = mkUser({
      id: "r",
      lookingFor: { ...tags, connectionType: ["social-circle"] },
    });
    const twin = mkUser({
      id: "a",
      self: { ...tags, activityTypes: ["coffee"] },
      lookingFor: { connectionType: ["social-circle"] },
    });
    const score = scorePair(requester, twin);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("explain()", () => {
  it("returns the shared interests between two users", () => {
    const a = mkUser({ self: { interests: ["techno", "film"] } });
    const b = mkUser({ self: { interests: ["film", "opera"] } });
    expect(explain(a, b).sharedInterests).toEqual(["film"]);
  });

  it("matches the requester's wanted personality against the candidate's self", () => {
    const a = mkUser({ lookingFor: { personality: ["chill", "curious"] } });
    const b = mkUser({ self: { personality: ["curious"] } });
    expect(explain(a, b).matchedPersonalityTraits).toEqual(["curious"]);
  });

  it("returns empty arrays when nothing overlaps", () => {
    const a = mkUser({ self: { interests: ["techno"] } });
    const b = mkUser({ self: { interests: ["opera"] } });
    expect(explain(a, b).sharedInterests).toEqual([]);
    expect(explain(a, b).sharedActivityTypes).toEqual([]);
  });
});
