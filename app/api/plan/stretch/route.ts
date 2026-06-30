import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/lib/generatePlan";
import { persistPlan, type PlanRefinement } from "@/lib/plans";
import { userFromRow } from "@/lib/userRow";
import { buildPlanResponse } from "@/lib/planResponse";
import { detectStretch, stretchFallbackLine } from "@/lib/stretchPlan";
import { narrateStretch } from "@/lib/whyNarrate";

// POST /api/plan/stretch
//
// The "stretch moment" (Module 4 M4.5). Ora proactively offers ONE plan that
// gently pushes past the user's STATED comfort zone (today: a small-group user
// gets a bigger, more communal table), with an honest, suggestion-framed note.
//
// No body. Uses the signed-in user's existing profile. Returns:
//   { stretch: { usualLabel, thisLabel } | null, plan: PlanResponse | null }
// stretch === null means the user's stated preferences don't warrant one.
//
// Thin wrapper: detect the angle (pure lib), build the plan (deterministic
// generatePlan with a larger k + communal activity), narrate it best-effort
// (falls back to the deterministic line), persist tagged as a stretch.

export const runtime = "nodejs";

export async function POST() {
  const sb = await createClient();
  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

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
      { error: "Build your first Plan before Ora can stretch it" },
      { status: 400 },
    );
  }

  const requester = userFromRow(requesterRow);

  const angle = detectStretch(requester.selfExtracted);
  if (!angle) {
    // Not eligible: the user already likes big, lively groups. No stretch.
    return NextResponse.json({ stretch: null, plan: null });
  }

  try {
    const plan = await generatePlan(sb, requester, {
      k: angle.k,
      activityOverride: angle.activityOverride,
    });

    // The deterministic line is the guaranteed fallback; upgrade it best-effort.
    const fallback = stretchFallbackLine(angle, plan.activityType, plan.place.name);
    plan.whyThisPlan = await narrateStretch(plan, requester, angle, fallback);

    const refinement: PlanRefinement = {
      activityType: angle.activityOverride,
      stretch: true,
    };
    const persistedPlanId = await persistPlan(sb, plan, refinement);
    const response = buildPlanResponse(plan, requester, persistedPlanId);

    return NextResponse.json({
      stretch: { usualLabel: angle.usualLabel, thisLabel: angle.thisLabel },
      plan: response,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build the stretch plan" },
      { status: 500 },
    );
  }
}
