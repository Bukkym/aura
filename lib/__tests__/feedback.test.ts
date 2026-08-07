import { describe, it, expect } from "vitest";
import { buildFeedbackRows } from "../feedback";

describe("buildFeedbackRows", () => {
  it("maps picks to directional rows", () => {
    expect(buildFeedbackRows("plan1", "rater1", { a: true, b: false })).toEqual([
      { plan_id: "plan1", rater_id: "rater1", ratee_id: "a", would_meet_again: true },
      { plan_id: "plan1", rater_id: "rater1", ratee_id: "b", would_meet_again: false },
    ]);
  });

  it("excludes the rater themselves and empty ids", () => {
    expect(buildFeedbackRows("plan1", "rater1", { rater1: true, "": true, c: true })).toEqual([
      { plan_id: "plan1", rater_id: "rater1", ratee_id: "c", would_meet_again: true },
    ]);
  });

  it("coerces truthiness to a strict boolean", () => {
    const rows = buildFeedbackRows("p", "r", { a: undefined as unknown as boolean });
    expect(rows).toEqual([{ plan_id: "p", rater_id: "r", ratee_id: "a", would_meet_again: false }]);
  });

  it("returns empty for no picks", () => {
    expect(buildFeedbackRows("p", "r", {})).toEqual([]);
  });
});
