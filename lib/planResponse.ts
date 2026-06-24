import { explain } from "./match";
import type { Match, Plan, SelfExtracted, User } from "@/types";

// The client-facing shape of a plan (embeddings stripped, per-attendee match
// explanation attached) and the mapper that builds it. Lives in /lib so the
// plan routes stay thin and all three (create, refine, current) return the
// identical shape. Route files can't export non-handler values, so this can't
// live in a route module.

export interface AttendeeView {
  userId: string;
  displayName: string;
  archetype?: string;
  selfExtracted: SelfExtracted;
  explanation: Match["explanations"];
}

export interface PlanResponse {
  planId: string;
  createdForUserId: string;
  createdForDisplayName: string;
  activityType: string;
  place: {
    id: string;
    name: string;
    type: string;
    neighborhood: string;
    address: string;
    description: string;
  };
  dateTime: string;
  vibe: string[];
  attendees: AttendeeView[];
  whyThisPlan: string;
}

// `planId` is the persisted row id, not the in-memory plan.planId.
export function buildPlanResponse(plan: Plan, requester: User, planId: string): PlanResponse {
  return {
    planId,
    createdForUserId: plan.createdForUserId,
    createdForDisplayName: requester.displayName,
    activityType: plan.activityType,
    place: {
      id: plan.place.id,
      name: plan.place.name,
      type: plan.place.type,
      neighborhood: plan.place.neighborhood,
      address: plan.place.address,
      description: plan.place.description,
    },
    dateTime: plan.dateTime,
    vibe: plan.vibe,
    attendees: plan.attendees.map((a) => ({
      userId: a.userId,
      displayName: a.displayName,
      archetype: a._archetype,
      selfExtracted: a.selfExtracted,
      explanation: explain(requester, a),
    })),
    whyThisPlan: plan.whyThisPlan,
  };
}
