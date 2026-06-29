import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/types";
import type { ToolDef } from "./aiProvider";
import { generatePlan } from "./generatePlan";
import {
  persistPlan,
  declinePlan,
  loadCurrentPlanContext,
  type PlanRefinement,
} from "./plans";
import { buildPlanResponse, type PlanResponse } from "./planResponse";

// Ora's in-app tools. The hero is refine_plan (natural-language refinement);
// the rest are supporting actions. Every tool is scoped to the authenticated
// user via the injected requester, never a model-supplied id, and the schemas
// are a pure constant so they can be unit-tested without any I/O.

export const ORA_TOOLS: ToolDef[] = [
  {
    name: "get_current_plan",
    description:
      "Look up the user's current plan (activity, place, time, who is in it, and the reason for the match). Call this before refining or withdrawing so you know what they have.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "refine_plan",
    description:
      "Adjust the user's CURRENT plan when they want a change. Use this for refinements like 'more outdoorsy', 'something more relaxed', 'a different crowd', or 'a different activity'. Map their wish to a concrete activity from Aura's vocabulary (e.g. outdoorsy -> hiking or cycling tours; relaxed -> cafe work sessions or book clubs; active -> boulder gym). Set fresh_group to true when they want different people. Provide at least one of activity or fresh_group.",
    input_schema: {
      type: "object",
      properties: {
        activity: {
          type: "string",
          description:
            "A different activity to try, drawn from Aura's activity vocabulary (e.g. 'hiking', 'boulder gym', 'cafe work sessions', 'gallery openings', 'cycling tours', 'book clubs').",
        },
        fresh_group: {
          type: "boolean",
          description: "True if the user wants Ora to find different people (excludes the current attendees).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "request_new_plan",
    description:
      "Create a brand-new plan from the user's saved profile, separate from their current one. Use when they ask for 'another plan' or 'something new'. Optionally pass an activity to steer it.",
    input_schema: {
      type: "object",
      properties: {
        activity: {
          type: "string",
          description: "Optional activity to steer the new plan toward, from Aura's vocabulary.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "withdraw_current_plan",
    description:
      "Withdraw the user from their current plan (this is how they leave or cancel it). Destructive: only call this AFTER the user has clearly confirmed they want to withdraw.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

export type OraToolName = (typeof ORA_TOOLS)[number]["name"];

export interface OraToolDeps {
  sb: SupabaseClient;
  requester: User;
}

export interface OraToolResult {
  /** Short natural-language result fed back to the model. */
  result: string;
  /** A plan to surface in the UI, when the tool produced or read one. */
  plan?: PlanResponse;
}

/**
 * Execute one Ora tool against the real lib functions. All plan operations are
 * keyed to the authenticated requester, so the model cannot act on anyone else.
 */
export async function executeOraTool(
  deps: OraToolDeps,
  name: string,
  input: Record<string, unknown>,
): Promise<OraToolResult> {
  const { sb, requester } = deps;
  const activity = typeof input.activity === "string" ? input.activity.trim() || undefined : undefined;
  const freshGroup = input.fresh_group === true;

  switch (name) {
    case "get_current_plan": {
      const ctx = await loadCurrentPlanContext(sb, requester.userId);
      if (!ctx) return { result: "The user has no current plan." };
      const plan = buildPlanResponse(ctx.plan, ctx.requester, ctx.plan.planId);
      return { result: describePlan(plan, ctx.status), plan };
    }

    case "refine_plan": {
      if (!activity && !freshGroup) {
        return { result: "Refinement needs a different activity or a fresh group. Ask the user what to change." };
      }
      const ctx = await loadCurrentPlanContext(sb, requester.userId);
      const excludeUserIds =
        freshGroup && ctx ? ctx.plan.attendees.map((a) => a.userId) : [];
      const plan = await generatePlan(sb, requester, {
        activityOverride: activity,
        excludeUserIds,
      });
      const refinement: PlanRefinement = { activityType: activity, excludeUserIds };
      const planId = await persistPlan(sb, plan, refinement);
      const response = buildPlanResponse(plan, requester, planId);
      return { result: `Refined plan: ${describePlan(response, "ready")}`, plan: response };
    }

    case "request_new_plan": {
      const plan = await generatePlan(sb, requester, { activityOverride: activity });
      const planId = await persistPlan(sb, plan, { activityType: activity, excludeUserIds: [] });
      const response = buildPlanResponse(plan, requester, planId);
      return { result: `New plan: ${describePlan(response, "ready")}`, plan: response };
    }

    case "withdraw_current_plan": {
      const ctx = await loadCurrentPlanContext(sb, requester.userId);
      if (!ctx) return { result: "There is no current plan to withdraw from." };
      await declinePlan(sb, ctx.plan.planId);
      return { result: "Withdrawn from the current plan. The user's seat is freed." };
    }

    default:
      return { result: `Unknown tool: ${name}` };
  }
}

/** Pure one-line description of a plan for the model and logs. */
export function describePlan(plan: PlanResponse, status: string): string {
  const who =
    plan.attendees.length > 0
      ? plan.attendees.map((a) => a.displayName).join(", ")
      : "no one yet";
  return `${plan.activityType} at ${plan.place.name} (${plan.place.neighborhood}), status ${status}, with ${who}.`;
}
