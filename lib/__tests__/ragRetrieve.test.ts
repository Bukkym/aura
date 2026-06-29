import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  retrieveTopK,
  buildContext,
  type EmbeddedChunk,
} from "../ragRetrieve";

describe("cosineSimilarity()", () => {
  it("is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("is close to -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1);
  });

  it("returns 0 (not NaN) for empty, mismatched, or zero vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

function chunk(id: string, embedding: number[]): EmbeddedChunk {
  return { id, source: "s", title: "T", heading: id, text: `text ${id}`, embedding };
}

describe("retrieveTopK()", () => {
  const chunks = [
    chunk("a", [1, 0, 0]),
    chunk("b", [0.9, 0.1, 0]),
    chunk("c", [0, 1, 0]),
    chunk("d", [0, 0, 1]),
  ];

  it("ranks by cosine similarity to the query, most similar first", () => {
    const res = retrieveTopK([1, 0, 0], chunks, { k: 2 });
    expect(res.map((c) => c.id)).toEqual(["a", "b"]);
    expect(res[0].score).toBeGreaterThan(res[1].score);
  });

  it("respects k", () => {
    expect(retrieveTopK([1, 0, 0], chunks, { k: 1 })).toHaveLength(1);
    expect(retrieveTopK([1, 0, 0], chunks, { k: 10 })).toHaveLength(4);
  });

  it("drops chunks below minScore so the agent can fall back", () => {
    const res = retrieveTopK([1, 0, 0], chunks, { k: 4, minScore: 0.5 });
    // only a (1.0) and b (~0.994) clear 0.5; c and d are orthogonal (0)
    expect(res.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("returns an empty array when nothing clears the threshold", () => {
    expect(retrieveTopK([0, 0, 1], chunks, { minScore: 0.99 }).map((c) => c.id)).toEqual([
      "d",
    ]);
    expect(retrieveTopK([1, 1, 1], [chunk("c", [-1, -1, -1])], { minScore: 0.1 })).toEqual(
      [],
    );
  });
});

describe("buildContext()", () => {
  it("joins retrieved chunk text with separators, most relevant first", () => {
    const res = retrieveTopK([1, 0, 0], [chunk("a", [1, 0, 0]), chunk("c", [0, 1, 0])], {
      k: 2,
    });
    const ctx = buildContext(res);
    expect(ctx).toContain("text a");
    expect(ctx.indexOf("text a")).toBeLessThan(ctx.indexOf("text c"));
  });

  it("returns an empty string for no chunks", () => {
    expect(buildContext([])).toBe("");
  });
});
