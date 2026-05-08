// Shared types — mirror the data model in /technical/02-data-model.md.

export type ConnectionType =
  | "close-friendships"
  | "social-circle"
  | "activity-buddies"
  | "new-city-support";

export type Budget = "low" | "mid" | "high" | "any";

export interface SelfExtracted {
  personality: string[];
  interests: string[];
  activityTypes: string[];
  socialPreferences: string[];
  lifeContext: string[];
  vibeKeywords: string[];
  availability?: string[];
  budget?: Budget;
}

export interface LookingForExtracted {
  personality: string[];
  interests: string[];
  socialPreferences: string[];
  vibeKeywords: string[];
  connectionType: ConnectionType[];
}

export interface User {
  userId: string;
  displayName: string;
  city: "Berlin";
  ageRange?: { min: number; max: number };
  createdAt: string;
  rawInputs: {
    selfDescription: string;
    lookingFor: string;
  };
  selfExtracted: SelfExtracted;
  lookingForExtracted: LookingForExtracted;
  selfEmbedding: number[];
  lookingForEmbedding: number[];

  /** Dev-only label for mock users — used by the "Why these six?" panel. Empty for real users. */
  _archetype?: string;
}

export type PlaceType =
  | "cafe"
  | "bar"
  | "club"
  | "gallery"
  | "park"
  | "gym"
  | "venue"
  | "other";

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  neighborhood: string;
  activityTypeTags: string[];
  vibeTags: string[];
  description: string;
  embedding: number[];
}

export interface Plan {
  planId: string;
  hostUserId: string;
  activityType: string;
  place: Place;
  dateTime: string;
  vibe: string[];
  attendees: User[];
  whyThisPlan: string;
}

export interface Match {
  queryUserId: string;
  matchedUserId: string;
  score: number;
  explanations: {
    sharedInterests: string[];
    sharedActivityTypes: string[];
    sharedSocialPreferences: string[];
    sharedLifeContext: string[];
    matchedPersonalityTraits: string[];
    summary?: string;
  };
}
