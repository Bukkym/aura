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
  /** Berlin neighborhoods the user frequents, or ["any"]. Added in Module 3. */
  neighborhoods?: string[];
  budget?: Budget;
}

export interface LookingForExtracted {
  personality: string[];
  interests: string[];
  socialPreferences: string[];
  vibeKeywords: string[];
  connectionType: ConnectionType[];
  /** Shared activities the user wants with the people they meet. Added in Module 3. */
  activityTypes?: string[];
  /** Preferred neighborhoods to meet in, or ["any"]. Defaults to self.neighborhoods. */
  neighborhoods?: string[];
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

/** A plan is "ready" until the host accepts it, then "confirmed". */
export type PlanStatus = "ready" | "confirmed";

/** Lightweight, card-level view of a persisted plan, used by the Plans tab
 *  history. Carries enough to render a Ready/Confirmed card (no per-attendee
 *  detail, no embeddings). */
export interface PlanSummary {
  id: string;
  activityType: string;
  place: {
    name: string;
    neighborhood: string;
    type: PlaceType;
  };
  dateTime: string;
  vibe: string[];
  attendeeCount: number;
  /** First few attendees, enough to render the avatar stack. */
  attendees: { userId: string; displayName: string }[];
  status: PlanStatus;
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
