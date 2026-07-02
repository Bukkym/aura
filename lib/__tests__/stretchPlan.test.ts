import { describe, it, expect } from "vitest";
import { detectStretch, stretchFallbackLine } from "../stretchPlan";
import type { SelfExtracted } from "@/types";

function self(over: Partial<SelfExtracted> = {}): SelfExtracted {
  return {
    personality: [],
    interests: [],
    activityTypes: [],
    socialPreferences: [],
    lifeContext: [],
    vibeKeywords: [],
    ...over,
  };
}

describe("detectStretch()", () => {
  it("returns a group-size stretch for a stated small-group preference", () => {
    const angle = detectStretch(self({ socialPreferences: ["small-group"] }));
    expect(angle).not.toBeNull();
    expect(angle!.axis).toBe("group-size");
    expect(angle!.k).toBe(8);
    expect(angle!.thisLabel).toContain("9 seats");
  });

  it("returns null when the user already prefers big, lively groups", () => {
    expect(
      detectStretch(self({ socialPreferences: ["high-energy", "lively"] })),
    ).toBeNull();
  });

  it("anchors the communal activity to a matching interest", () => {
    const angle = detectStretch(
      self({ socialPreferences: ["one-on-one"], interests: ["books"] }),
    );
    expect(angle!.activityOverride).toBe("book clubs");
  });

  it("does not stretch toward the activity the user already does", () => {
    // food interest would normally pick "dinner parties"; if that's their usual,
    // it must choose a different communal activity.
    const angle = detectStretch(
      self({
        socialPreferences: ["small-group"],
        interests: ["food"],
        activityTypes: ["dinner parties"],
      }),
    );
    expect(angle!.activityOverride).not.toBe("dinner parties");
  });

  it("falls back to a default communal activity with no matching interest", () => {
    const angle = detectStretch(
      self({ socialPreferences: ["intimate"], interests: ["cycling"] }),
    );
    expect(angle!.activityOverride).toBe("dinner parties");
  });
});

describe("stretchFallbackLine()", () => {
  it("states the seat count, activity and venue, suggestion-framed, no em dash", () => {
    const angle = detectStretch(self({ socialPreferences: ["small-group"] }))!;
    const line = stretchFallbackLine(angle, "dinner parties", "Lentil & Lark");
    expect(line).toContain("9");
    expect(line).toContain("dinner parties");
    expect(line).toContain("Lentil & Lark");
    expect(line.toLowerCase()).toContain("ora thinks");
    expect(line).not.toContain("—");
  });
});
