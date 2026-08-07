import { describe, it, expect } from "vitest";
import { journeyStep, dedupeCrew, JOURNEY_TOTAL } from "../journey";

describe("journeyStep", () => {
  it("is the confirmed count, capped at the journey length", () => {
    expect(journeyStep(0)).toBe(0);
    expect(journeyStep(3)).toBe(3);
    expect(journeyStep(5)).toBe(5);
    expect(journeyStep(9)).toBe(JOURNEY_TOTAL);
  });
  it("guards against bad input", () => {
    expect(journeyStep(-2)).toBe(0);
    expect(journeyStep(NaN)).toBe(0);
    expect(journeyStep(2.7)).toBe(2);
  });
});

describe("dedupeCrew", () => {
  it("dedupes, excludes self, and caps", () => {
    const members = [
      { id: "a", name: "Ada" },
      { id: "a", name: "Ada" },
      { id: "me", name: "Me" },
      { id: "n", name: "Nadia" },
      { id: "r", name: "Rina" },
    ];
    expect(dedupeCrew(members, "me", 4)).toEqual([
      { id: "a", name: "Ada" },
      { id: "n", name: "Nadia" },
      { id: "r", name: "Rina" },
    ]);
  });
  it("respects the limit", () => {
    const members = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    expect(dedupeCrew(members, "me", 2)).toHaveLength(2);
  });
});
