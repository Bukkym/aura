import { describe, it, expect } from "vitest";
import { ORA_TOOLS, describePlan } from "../oraTools";
import type { PlanResponse } from "../planResponse";

describe("ORA_TOOLS", () => {
  it("exposes the four in-app tools by name", () => {
    expect(ORA_TOOLS.map((t) => t.name).sort()).toEqual([
      "get_current_plan",
      "refine_plan",
      "request_new_plan",
      "withdraw_current_plan",
    ]);
  });

  it("gives every tool a description and an object input schema", () => {
    for (const tool of ORA_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(10);
      expect((tool.input_schema as { type: string }).type).toBe("object");
    }
  });

  it("lets refine_plan take activity and fresh_group", () => {
    const refine = ORA_TOOLS.find((t) => t.name === "refine_plan");
    const props = (refine!.input_schema as { properties: Record<string, unknown> }).properties;
    expect(Object.keys(props).sort()).toEqual(["activity", "fresh_group"]);
  });

  it("keeps the destructive tool's description explicit about confirmation", () => {
    const withdraw = ORA_TOOLS.find((t) => t.name === "withdraw_current_plan");
    expect(withdraw!.description.toLowerCase()).toContain("confirm");
  });
});

function plan(over: Partial<PlanResponse> = {}): PlanResponse {
  return {
    planId: "p1",
    createdForUserId: "u1",
    createdForDisplayName: "Sofia",
    activityType: "boulder gym",
    place: {
      id: "v1",
      name: "Ostbloc",
      type: "gym",
      neighborhood: "Friedrichshain",
      address: "",
      description: "",
    },
    dateTime: "2026-07-01T17:00:00.000Z",
    vibe: ["active"],
    attendees: [
      { userId: "a", displayName: "Anton" },
      { userId: "b", displayName: "Nour" },
    ] as PlanResponse["attendees"],
    whyThisPlan: "",
    ...over,
  };
}

describe("describePlan()", () => {
  it("summarizes activity, place, status, and attendees in one line", () => {
    const line = describePlan(plan(), "ready");
    expect(line).toContain("boulder gym at Ostbloc (Friedrichshain)");
    expect(line).toContain("status ready");
    expect(line).toContain("Anton, Nour");
  });

  it("handles an empty attendee list", () => {
    expect(describePlan(plan({ attendees: [] }), "ready")).toContain("no one yet");
  });
});
