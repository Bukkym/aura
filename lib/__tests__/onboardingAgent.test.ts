import { describe, it, expect, vi } from "vitest";
import { onboardingConverseTurn } from "../onboardingAgent";
import type { ExtractedProfile, MissingField } from "../onboardingMissing";

type AskArgs = { missing: MissingField[]; transcript: string };

function complete(): ExtractedProfile {
  return {
    self: {
      personality: ["chill", "ambitious"],
      interests: ["startups", "techno"],
      activityTypes: ["boulder gym"],
      socialPreferences: ["small-group"],
      lifeContext: [],
      vibeKeywords: ["chill", "creative"],
      availability: ["weekend evenings"],
      neighborhoods: ["Kreuzberg"],
    },
    lookingFor: {
      personality: ["curious", "creative"],
      interests: ["startups"],
      socialPreferences: ["small-group"],
      vibeKeywords: ["chill"],
      connectionType: ["activity-buddies"],
      activityTypes: ["boulder gym"],
      neighborhoods: ["Kreuzberg"],
    },
  };
}

function sparse(): ExtractedProfile {
  const p = complete();
  p.self.interests = []; // a clear gap
  p.lookingFor.connectionType = [];
  return p;
}

describe("onboardingConverseTurn()", () => {
  it("returns done with a confirmation when the profile is complete, without asking", async () => {
    const askFn = vi.fn();
    const res = await onboardingConverseTurn({
      utterances: ["I'm chill and ambitious, into startups and techno..."],
      extractFn: async () => complete(),
      askFn,
    });
    expect(res.done).toBe(true);
    expect(res.missing).toEqual([]);
    expect(askFn).not.toHaveBeenCalled();
    expect(res.draft.selfExtracted.interests).toContain("startups");
  });

  it("asks a follow-up about the gaps when the profile is incomplete", async () => {
    const askFn = vi.fn(async (_args: AskArgs) => "What are you into?");
    const res = await onboardingConverseTurn({
      utterances: ["I just moved here."],
      extractFn: async () => sparse(),
      askFn,
    });
    expect(res.done).toBe(false);
    expect(res.reply).toBe("What are you into?");
    expect(askFn).toHaveBeenCalledOnce();
    const arg = askFn.mock.calls[0][0];
    expect(arg.missing.map((m) => m.field)).toContain("self.interests");
  });

  it("stops asking once maxAsk answers have been taken, handing off to the chips", async () => {
    const askFn = vi.fn(async (_args: AskArgs) => "another question");
    // opening utterance + 2 answers = 2 answers taken, maxAsk default 2
    const res = await onboardingConverseTurn({
      utterances: ["opening", "answer one", "answer two"],
      extractFn: async () => sparse(),
      askFn,
    });
    expect(res.done).toBe(true);
    expect(askFn).not.toHaveBeenCalled();
    // still surfaces the remaining gaps so the chip flow can highlight them
    expect(res.missing.length).toBeGreaterThan(0);
  });

  it("ignores blank utterances when building the transcript", async () => {
    const extractFn = vi.fn(async () => complete());
    await onboardingConverseTurn({
      utterances: ["  ", "real text", ""],
      extractFn,
      askFn: async () => "",
    });
    expect(extractFn).toHaveBeenCalledWith("real text");
  });
});
