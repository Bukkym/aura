import { describe, it, expect } from "vitest";
import {
  isProfileComplete,
  missingRequiredFields,
  type ExtractedProfile,
} from "../onboardingMissing";
import type { LookingForExtracted, SelfExtracted } from "@/types";

// A profile that meets every required minimum.
function completeProfile(): ExtractedProfile {
  const self: SelfExtracted = {
    personality: ["chill", "ambitious"],
    interests: ["startups", "techno"],
    activityTypes: ["boulder gym"],
    socialPreferences: ["small-group"],
    lifeContext: [],
    vibeKeywords: ["chill", "creative"],
    availability: ["weekend evenings"],
    neighborhoods: ["Kreuzberg"],
  };
  const lookingFor: LookingForExtracted = {
    personality: ["curious", "creative"],
    interests: ["startups"],
    socialPreferences: ["small-group"],
    vibeKeywords: ["chill"],
    connectionType: ["activity-buddies"],
    activityTypes: ["boulder gym"],
    neighborhoods: ["Kreuzberg"],
  };
  return { self, lookingFor };
}

function emptyProfile(): ExtractedProfile {
  return {
    self: {
      personality: [],
      interests: [],
      activityTypes: [],
      socialPreferences: [],
      lifeContext: [],
      vibeKeywords: [],
      availability: [],
      neighborhoods: [],
    },
    lookingFor: {
      personality: [],
      interests: [],
      socialPreferences: [],
      vibeKeywords: [],
      connectionType: [],
      activityTypes: [],
      neighborhoods: [],
    },
  };
}

describe("missingRequiredFields()", () => {
  it("returns nothing for a complete profile", () => {
    expect(missingRequiredFields(completeProfile())).toEqual([]);
    expect(isProfileComplete(completeProfile())).toBe(true);
  });

  it("flags all ten required fields for an empty profile", () => {
    const missing = missingRequiredFields(emptyProfile());
    expect(missing.map((m) => m.field)).toEqual([
      "self.personality",
      "self.vibeKeywords",
      "self.interests",
      "self.activityTypes",
      "self.neighborhoods",
      "self.availability",
      "self.socialPreferences",
      "lookingFor.connectionType",
      "lookingFor.personality",
      "lookingFor.interests",
    ]);
    expect(isProfileComplete(emptyProfile())).toBe(false);
  });

  it("flags a field that is present but below its minimum", () => {
    const p = completeProfile();
    p.self.personality = ["chill"]; // need 2, have 1
    const missing = missingRequiredFields(p);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({
      field: "self.personality",
      have: 1,
      need: 2,
    });
    expect(missing[0].question).toMatch(/describe yourself/i);
  });

  it("treats ['any'] neighborhoods as satisfied", () => {
    const p = completeProfile();
    p.self.neighborhoods = ["any"];
    expect(missingRequiredFields(p)).toEqual([]);
  });

  it("does not require the mirrored lookingFor fields directly", () => {
    // lookingFor.vibeKeywords / activityTypes / socialPreferences are mirrored
    // from the self side by the chip mapper, so emptying them is not a gap.
    const p = completeProfile();
    p.lookingFor.vibeKeywords = [];
    p.lookingFor.activityTypes = [];
    p.lookingFor.socialPreferences = [];
    expect(missingRequiredFields(p)).toEqual([]);
  });

  it("ignores blank/whitespace tags when counting", () => {
    const p = completeProfile();
    p.self.interests = ["startups", "   "]; // only one real tag, need 2
    const missing = missingRequiredFields(p);
    expect(missing.map((m) => m.field)).toContain("self.interests");
  });
});
