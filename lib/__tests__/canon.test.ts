import { describe, it, expect } from "vitest";
import { canon, canonAll, jaccard, overlaps, commonTags } from "../canon";

// ── RED: write the tests first, before verifying they pass ──────────────────

describe("canon()", () => {
  it("returns the canonical form for a known drift variant", () => {
    expect(canon("easy-going")).toBe("easygoing");
    expect(canon("chilled")).toBe("chill");
    expect(canon("exploratory")).toBe("explorative");
    expect(canon("gallery openings")).toBe("gallery");
    expect(canon("dinner parties")).toBe("dinner party");
  });

  it("lowercases and trims before looking up", () => {
    expect(canon("  Easy-Going  ")).toBe("easygoing");
    expect(canon("CHILLED")).toBe("chill");
  });

  it("returns the tag unchanged when no drift mapping exists", () => {
    expect(canon("ambitious")).toBe("ambitious");
    expect(canon("techno")).toBe("techno");
  });
});

describe("canonAll()", () => {
  it("returns empty array for null or undefined input", () => {
    expect(canonAll(null)).toEqual([]);
    expect(canonAll(undefined)).toEqual([]);
  });

  it("deduplicates tags that canonicalize to the same value", () => {
    // "exploratory" and "explorer" both map to "explorative"
    const result = canonAll(["exploratory", "explorer", "ambitious"]);
    expect(result).toEqual(["explorative", "ambitious"]);
    expect(result.length).toBe(2);
  });

  it("drops empty strings", () => {
    expect(canonAll(["ambitious", "", "  ", "chill"])).toEqual([
      "ambitious",
      "chill",
    ]);
  });
});

describe("jaccard()", () => {
  it("returns 1 for identical sets", () => {
    expect(jaccard(["a", "b", "c"], ["a", "b", "c"])).toBe(1);
  });

  it("returns 0 when there is no overlap", () => {
    expect(jaccard(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("returns the correct partial overlap score", () => {
    // intersection = {b}, union = {a, b, c, d} → 1/4 = 0.25
    expect(jaccard(["a", "b"], ["b", "c", "d"])).toBeCloseTo(1 / 4);
  });

  it("returns 0 when either input is empty", () => {
    expect(jaccard([], ["a", "b"])).toBe(0);
    expect(jaccard(["a"], [])).toBe(0);
    expect(jaccard([], [])).toBe(0);
  });

  it("is not affected by duplicates within a single array", () => {
    // Sets deduplicate, so ["a","a","b"] treated as {a,b}
    expect(jaccard(["a", "a", "b"], ["a", "b"])).toBe(1);
  });
});

// ── RED: commonTags does not exist yet — these will fail ────────────────────
describe("commonTags()", () => {
  it("returns the shared canonical tags between two arrays", () => {
    expect(commonTags(["ambitious", "chill"], ["chill", "curious"])).toEqual([
      "chill",
    ]);
  });

  it("canonicalizes drift variants before comparing", () => {
    // "easy-going" and "easygoing" are the same tag — should match
    expect(
      commonTags(["easy-going", "ambitious"], ["easygoing", "curious"]),
    ).toEqual(["easygoing"]);
  });

  it("returns empty array when there is no overlap", () => {
    expect(commonTags(["ambitious"], ["chill"])).toEqual([]);
  });
});

describe("overlaps()", () => {
  it("returns true when arrays share at least one tag", () => {
    expect(overlaps(["ambitious", "chill"], ["chill", "curious"])).toBe(true);
  });

  it("returns false when arrays share no tags", () => {
    expect(overlaps(["ambitious"], ["chill"])).toBe(false);
  });

  it("returns false when either array is empty", () => {
    expect(overlaps([], ["chill"])).toBe(false);
    expect(overlaps(["ambitious"], [])).toBe(false);
  });
});
