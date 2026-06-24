import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/lib/generatePlan";
import { persistPlan, type PlanRefinement } from "@/lib/plans";
import { userFromRow } from "@/lib/userRow";
import { buildPlanResponse } from "@/lib/planResponse";

// POST /api/plan/refine
//
// Body: { refinement: { activityType?: string; excludeUserIds?: string[] } }
// "Request another Plan": the profile stays fixed, but Ora builds a new plan
// with a different activity and/or a different group (excluding people who
// didn't fit). Unlike /api/plan/create it does NOT upsert the profile; it
// requires an already-onboarded user. The relaxed persistPlan dedupe means a
// genuinely different activity/place becomes a new row, so the user keeps both.
//
// No quota is enforced yet (lib/plans.countPlansSince is ready for when one is).

interface RefineBody {
  refinement?: {
    activityType?: unknown;
    excludeUserIds?: unknown;
  };
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: RefineBody;
  try {
    body = (await request.json()) as RefineBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.refinement ?? {};

  if (raw.activityType !== undefined && typeof raw.activityType !== "string") {
    return NextResponse.json(
      { error: "refinement.activityType must be a string" },
      { status: 400 },
    );
  }
  if (
    raw.excludeUserIds !== undefined &&
    (!Array.isArray(raw.excludeUserIds) || raw.excludeUserIds.some((id) => typeof id !== "string"))
  ) {
    return NextResponse.json(
      { error: "refinement.excludeUserIds must be an array of strings" },
      { status: 400 },
    );
  }

  const activityType = (raw.activityType as string | undefined)?.trim() || undefined;
  const excludeUserIds = (raw.excludeUserIds as string[] | undefined) ?? [];
  if (!activityType && excludeUserIds.length === 0) {
    return NextResponse.json(
      { error: "Provide a different activityType or excludeUserIds to refine" },
      { status: 400 },
    );
  }

  const refinement: PlanRefinement = { activityType, excludeUserIds };

  // Refine reuses the existing profile; it never re-onboards. If there's no
  // user row yet, the caller hasn't built a first plan.
  const { data: requesterRow, error: lookupErr } = await sb
    .from("users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json(
      { error: `User lookup failed: ${lookupErr.message}` },
      { status: 500 },
    );
  }
  if (!requesterRow) {
    return NextResponse.json(
      { error: "Build your first Plan before requesting another" },
      { status: 400 },
    );
  }

  const requester = userFromRow(requesterRow);

  try {
    const plan = await generatePlan(sb, requester, { activityOverride: activityType, excludeUserIds });
    const persistedPlanId = await persistPlan(sb, plan, refinement);
    const response = buildPlanResponse(plan, requester, persistedPlanId);
    return NextResponse.json({ plan: response });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build plan" },
      { status: 500 },
    );
  }
}
