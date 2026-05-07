import type { SelfExtracted, LookingForExtracted } from "@/types";

// Stub for the LLM extraction pass. Real implementation calls OpenAI with the
// raw transcript and returns canonicalized tags per the data model.

export async function extract(_rawInput: string): Promise<{
  self: SelfExtracted;
  lookingFor: LookingForExtracted;
}> {
  await new Promise((r) => setTimeout(r, 600));
  return {
    self: {
      personality: ["chill", "ambitious", "curious"],
      interests: ["startups", "philosophy"],
      activityTypes: ["boulder gym", "weekend hikes"],
      socialPreferences: ["small-group", "low-pressure"],
      lifeContext: ["new to Berlin", "remote worker"],
      vibeKeywords: [],
    },
    lookingFor: {
      personality: ["chill", "ambitious"],
      interests: ["startups"],
      socialPreferences: ["low-pressure"],
      vibeKeywords: [],
      connectionType: ["activity-buddies", "close-friendships"],
    },
  };
}
