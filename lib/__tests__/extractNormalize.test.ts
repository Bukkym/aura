import { describe, it, expect } from "vitest";
import {
  normalizeExtraction,
  parseExtractionJson,
  VOCAB,
} from "../extractNormalize";

describe("normalizeExtraction()", () => {
  it("clamps tags to the closed taxonomy, dropping invented ones", () => {
    const { self } = normalizeExtraction({
      self: { interests: ["startups", "underwater basket weaving", "techno"] },
    });
    expect(self.interests).toEqual(["startups", "techno"]);
  });

  it("canonicalizes drift variants before clamping", () => {
    const { self } = normalizeExtraction({
      self: {
        personality: ["easy-going"],
        activities: ["gallery openings", "dinner parties"],
      },
    });
    // "easy-going" -> "easygoing" (in personality vocab)
    expect(self.personality).toEqual(["easygoing"]);
    // canon keeps "gallery openings" -> "gallery", but the activities vocab
    // stores the plural form, so canon must not strip what the vocab needs.
    expect(self.activityTypes).toEqual(["gallery openings", "dinner parties"]);
  });

  it("accepts the model's friendly key aliases (vibe, activities, social)", () => {
    const { self, lookingFor } = normalizeExtraction({
      self: { vibe: ["cozy"], activities: ["hiking"], social: ["small-group"] },
      lookingFor: { vibe: ["deep"], social: ["one-on-one"] },
    });
    expect(self.vibeKeywords).toEqual(["cozy"]);
    expect(self.activityTypes).toEqual(["hiking"]);
    expect(self.socialPreferences).toEqual(["small-group"]);
    expect(lookingFor.vibeKeywords).toEqual(["deep"]);
    expect(lookingFor.socialPreferences).toEqual(["one-on-one"]);
  });

  it("maps friendly connection-type labels to codes", () => {
    const { lookingFor } = normalizeExtraction({
      lookingFor: {
        connectionType: ["people to do things with", "help finding my footing here"],
      },
    });
    expect(lookingFor.connectionType).toEqual([
      "activity-buddies",
      "new-city-support",
    ]);
  });

  it("accepts raw connection-type codes directly", () => {
    const { lookingFor } = normalizeExtraction({
      lookingFor: { connectionType: ["close-friendships", "not-a-type"] },
    });
    expect(lookingFor.connectionType).toEqual(["close-friendships"]);
  });

  it("collapses 'anywhere in Berlin' to ['any'] and preserves casing otherwise", () => {
    expect(
      normalizeExtraction({ self: { neighborhoods: ["anywhere in Berlin"] } }).self
        .neighborhoods,
    ).toEqual(["any"]);
    // case-insensitive match, emits the canonical casing from the vocab
    expect(
      normalizeExtraction({ self: { neighborhoods: ["kreuzberg", "mitte"] } }).self
        .neighborhoods,
    ).toEqual(["Kreuzberg", "Mitte"]);
  });

  it("normalizes budget and omits it when nothing usable was said", () => {
    expect(normalizeExtraction({ self: { budget: ["mid"] } }).self.budget).toBe("mid");
    expect(
      normalizeExtraction({ self: { budget: ["whatever"] } }).self.budget,
    ).toBeUndefined();
    expect(normalizeExtraction({ self: {} }).self.budget).toBeUndefined();
  });

  it("accepts budget as a bare string, not just an array", () => {
    expect(normalizeExtraction({ self: { budget: "high" } }).self.budget).toBe("high");
  });

  it("dedupes within a field", () => {
    const { self } = normalizeExtraction({
      self: { interests: ["techno", "techno", "art"] },
    });
    expect(self.interests).toEqual(["techno", "art"]);
  });

  it("keeps lifeContext open (canonicalized, not clamped)", () => {
    const { self } = normalizeExtraction({
      self: { lifeContext: ["new to Berlin", "Remote Worker"] },
    });
    // open field: lowercased via canon, no vocab drop
    expect(self.lifeContext).toContain("new to berlin");
    expect(self.lifeContext).toContain("remote worker");
  });

  it("returns complete empty structures for empty input (no defaults injected)", () => {
    const { self, lookingFor } = normalizeExtraction({});
    expect(self.personality).toEqual([]);
    expect(self.interests).toEqual([]);
    expect(self.activityTypes).toEqual([]);
    expect(self.socialPreferences).toEqual([]);
    expect(self.vibeKeywords).toEqual([]);
    expect(self.lifeContext).toEqual([]);
    expect(self.availability).toEqual([]);
    expect(self.neighborhoods).toEqual([]);
    expect(self.budget).toBeUndefined();
    expect(lookingFor.connectionType).toEqual([]);
    expect(lookingFor.activityTypes).toEqual([]);
  });

  it("ignores non-array junk fields without throwing", () => {
    const { self } = normalizeExtraction({
      self: { personality: 42 as unknown as string[] },
    });
    expect(self.personality).toEqual([]);
  });
});

describe("parseExtractionJson()", () => {
  it("parses a bare JSON object", () => {
    expect(parseExtractionJson('{"self":{"interests":["art"]}}')).toEqual({
      self: { interests: ["art"] },
    });
  });

  it("strips code fences and surrounding prose", () => {
    const reply = 'Here you go:\n```json\n{"self":{"vibe":["cozy"]}}\n```\nDone.';
    expect(parseExtractionJson(reply)).toEqual({ self: { vibe: ["cozy"] } });
  });

  it("returns {} on unparseable input", () => {
    expect(parseExtractionJson("no json here")).toEqual({});
    expect(parseExtractionJson("")).toEqual({});
    expect(parseExtractionJson("{ broken")).toEqual({});
  });
});

describe("VOCAB", () => {
  it("exposes every closed picker list the prompt needs", () => {
    expect(VOCAB.personality.length).toBeGreaterThan(0);
    expect(VOCAB.connectionType).toContain("activity-buddies");
    expect(VOCAB.neighborhoods).toContain("Kreuzberg");
  });
});
