import { describe, it, expect, vi } from "vitest";
import {
  buildWhyPrompt,
  sanitizeNarration,
  narrateWhy,
  buildStretchPrompt,
  narrateStretch,
} from "../whyNarrate";
import type { StretchAngle } from "../stretchPlan";
import type { Place, Plan, User } from "@/types";

function user(id: string, name: string, interests: string[], vibe: string[]): User {
  return {
    userId: id,
    displayName: name,
    city: "Berlin",
    createdAt: "2026-01-01T00:00:00.000Z",
    rawInputs: { selfDescription: "", lookingFor: "" },
    selfExtracted: {
      personality: [],
      interests,
      activityTypes: [],
      socialPreferences: [],
      lifeContext: [],
      vibeKeywords: vibe,
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

const venue: Place = {
  id: "v1",
  name: "Ostbloc",
  type: "gym",
  neighborhood: "Friedrichshain",
  address: "",
  activityTypeTags: [],
  vibeTags: [],
  description: "",
  embedding: [],
};

function plan(): Plan {
  return {
    planId: "p1",
    createdForUserId: "u1",
    activityType: "boulder gym",
    place: venue,
    dateTime: "2026-07-04T11:00:00.000Z",
    vibe: ["active"],
    attendees: [
      user("a", "Anton Berg", ["climbing", "startups"], ["adventurous"]),
      user("b", "Nour Haddad", ["climbing", "techno"], ["adventurous"]),
    ],
    whyThisPlan: "Boulder gym at Ostbloc, Saturday morning, with 2 people Ora thought you'd enjoy.",
  };
}

const requester = user("u1", "Maya Stone", ["climbing", "design"], ["adventurous"]);

describe("buildWhyPrompt()", () => {
  it("includes the plan facts, the shared signals, and the baseline", () => {
    const prompt = buildWhyPrompt(plan(), requester);
    expect(prompt).toContain("boulder gym");
    expect(prompt).toContain("Ostbloc");
    expect(prompt).toContain("Friedrichshain");
    expect(prompt).toContain("Maya"); // requester first name
    expect(prompt).toContain("Anton"); // attendee first name
    expect(prompt).toContain("climbing"); // shared interest across all three
    expect(prompt).toContain("adventurous"); // shared vibe
    expect(prompt).toContain("Baseline sentence:");
  });
});

describe("sanitizeNarration()", () => {
  it("returns the fallback for empty or missing input", () => {
    expect(sanitizeNarration("", "FB")).toBe("FB");
    expect(sanitizeNarration(null, "FB")).toBe("FB");
    expect(sanitizeNarration("   ", "FB")).toBe("FB");
  });

  it("strips wrapping quotes and collapses whitespace", () => {
    expect(sanitizeNarration('  "A climb at Ostbloc."  ', "FB")).toBe("A climb at Ostbloc.");
    expect(sanitizeNarration("A climb\n  at Ostbloc.", "FB")).toBe("A climb at Ostbloc.");
  });

  it("replaces em/en dashes (project rule: no em dashes)", () => {
    expect(sanitizeNarration("Climbing — then drinks", "FB")).toBe("Climbing, then drinks");
    expect(sanitizeNarration("A–B", "FB")).toBe("A, B");
  });

  it("falls back when the model rambles past the length cap", () => {
    expect(sanitizeNarration("x".repeat(400), "FB")).toBe("FB");
  });
});

describe("narrateWhy()", () => {
  it("returns the sanitized LLM narration on success", async () => {
    const generate = vi.fn(async () => '"A climb Ora paired around adventurous energy."');
    const out = await narrateWhy(plan(), requester, { generate });
    expect(out).toBe("A climb Ora paired around adventurous energy.");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("falls back to the template on error", async () => {
    const generate = vi.fn(async () => {
      throw new Error("api down");
    });
    const p = plan();
    expect(await narrateWhy(p, requester, { generate })).toBe(p.whyThisPlan);
  });

  it("falls back to the template on timeout", async () => {
    const generate = vi.fn(
      () => new Promise<string>((r) => setTimeout(() => r("too late"), 50)),
    );
    const p = plan();
    expect(await narrateWhy(p, requester, { generate, timeoutMs: 5 })).toBe(p.whyThisPlan);
  });

  it("falls back to the template on empty model output", async () => {
    const generate = vi.fn(async () => "   ");
    const p = plan();
    expect(await narrateWhy(p, requester, { generate })).toBe(p.whyThisPlan);
  });
});

const angle: StretchAngle = {
  axis: "group-size",
  k: 8,
  activityOverride: "dinner parties",
  usualLabel: "Small tables, just a few faces.",
  thisLabel: "A bigger table, 9 seats.",
  reason: "you told me you like it small",
};

describe("buildStretchPrompt()", () => {
  it("includes the stated preference, the stretch, plan facts and seat count", () => {
    const prompt = buildStretchPrompt(plan(), requester, angle);
    expect(prompt).toContain("you told me you like it small");
    expect(prompt).toContain("9"); // seats = k + 1
    expect(prompt).toContain("boulder gym");
    expect(prompt).toContain("Ostbloc");
    expect(prompt).toContain("Maya");
  });
});

describe("narrateStretch()", () => {
  it("returns the sanitized narration on success", async () => {
    const generate = vi.fn(async () => "You keep it small, so I hesitated. Ora thinks this bigger table could surprise you.");
    const out = await narrateStretch(plan(), requester, angle, "FALLBACK", { generate });
    expect(out).toContain("Ora thinks");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("returns the given fallback on error", async () => {
    const generate = vi.fn(async () => {
      throw new Error("down");
    });
    expect(await narrateStretch(plan(), requester, angle, "FALLBACK", { generate })).toBe("FALLBACK");
  });

  it("returns the given fallback on timeout", async () => {
    const generate = vi.fn(() => new Promise<string>((r) => setTimeout(() => r("late"), 50)));
    expect(
      await narrateStretch(plan(), requester, angle, "FALLBACK", { generate, timeoutMs: 5 }),
    ).toBe("FALLBACK");
  });
});
