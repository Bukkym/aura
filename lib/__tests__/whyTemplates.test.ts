import { describe, it, expect } from "vitest";
import { renderWhyTemplate } from "../whyTemplates";
import type { Place, User } from "@/types";

function mkUser(
  id: string,
  name: string,
  self: Partial<User["selfExtracted"]> = {},
): User {
  return {
    userId: id,
    displayName: name,
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
      ...self,
    },
    lookingForExtracted: {
      personality: [],
      interests: [],
      socialPreferences: [],
      vibeKeywords: [],
      connectionType: [],
    },
    selfEmbedding: [],
    lookingForEmbedding: [],
  };
}

const VENUE: Place = {
  id: "v1",
  name: "Otto",
  type: "cafe",
  neighborhood: "Neukölln",
  address: "Oderstraße 1, 12049 Berlin",
  activityTypeTags: ["coffee"],
  vibeTags: ["warm"],
  description: "",
  embedding: [],
};

describe("renderWhyTemplate()", () => {
  it("is deterministic: same inputs produce the same sentence", () => {
    const requester = mkUser("r", "Sofia", {
      interests: ["techno"],
      vibeKeywords: ["warm"],
    });
    const attendees = [
      mkUser("a", "Anton", { interests: ["techno"], vibeKeywords: ["warm"] }),
      mkUser("b", "Nour", { interests: ["techno"], vibeKeywords: ["warm"] }),
    ];
    const first = renderWhyTemplate(requester, attendees, "coffee", VENUE, "Saturday morning");
    const second = renderWhyTemplate(requester, attendees, "coffee", VENUE, "Saturday morning");
    expect(first).toBe(second);
  });

  it("includes the venue name and lowercased time label", () => {
    const requester = mkUser("r", "Sofia", { vibeKeywords: ["warm"] });
    const attendees = [mkUser("a", "Anton", { vibeKeywords: ["warm"] })];
    const out = renderWhyTemplate(requester, attendees, "coffee", VENUE, "Saturday Morning");
    expect(out).toContain("Otto");
    expect(out).toContain("saturday morning");
    expect(out).not.toContain("Saturday Morning");
  });

  it("falls back to the tagless sentence when there is no shared signal", () => {
    // Requester and attendees share no interests or vibe, so no rich template
    // can be built and we must not print an "into undefined" placeholder.
    const requester = mkUser("r", "Sofia", { interests: ["opera"] });
    const attendees = [
      mkUser("a", "Anton", { interests: ["chess"] }),
      mkUser("b", "Nour", { interests: ["climbing"] }),
    ];
    const out = renderWhyTemplate(requester, attendees, "coffee", VENUE, "Sunday");
    expect(out).toContain("2 people Ora thought you'd enjoy");
    expect(out.toLowerCase()).not.toContain("undefined");
  });

  it("never emits an undefined placeholder even with partial signal", () => {
    const requester = mkUser("r", "Sofia", { vibeKeywords: ["warm"] });
    const attendees = [mkUser("a", "Anton", { vibeKeywords: ["warm"] })];
    const out = renderWhyTemplate(requester, attendees, "coffee", VENUE, "Friday evening");
    expect(out.toLowerCase()).not.toContain("undefined");
    expect(out.length).toBeGreaterThan(0);
  });
});
