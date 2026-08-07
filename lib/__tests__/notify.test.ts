import { describe, it, expect } from "vitest";
import { buildPlanMessage } from "../notify";

describe("buildPlanMessage", () => {
  const details = {
    activityType: "coffee and a walk",
    placeName: "Boxcar Social",
    neighborhood: "Riverside",
    address: "4 Boulton Ave, Toronto",
    when: "Saturday · 10:00am",
    groupSize: 3,
  };

  it("capitalizes the activity in the subject and body", () => {
    const { subject, text } = buildPlanMessage(details);
    expect(subject).toBe("Your Aura plan: Coffee and a walk");
    expect(text).toContain("Coffee and a walk");
  });

  it("includes place, address, time, and group size", () => {
    const { text } = buildPlanMessage(details);
    expect(text).toContain("Boxcar Social · Riverside");
    expect(text).toContain("4 Boulton Ave, Toronto");
    expect(text).toContain("Saturday · 10:00am");
    expect(text).toContain("3 others");
  });

  it("omits the address line when there is no address", () => {
    const { text } = buildPlanMessage({ ...details, address: undefined });
    expect(text).not.toContain("undefined");
  });
});
