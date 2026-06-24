import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadCurrentPlanContext, countAllPlans } from "@/lib/plans";
import { buildPlanResponse, type PlanResponse } from "@/lib/planResponse";
import type { PlanStatus } from "@/types";

// GET /api/plan/current
//
// The signed-in user's current plan (most recent non-declined upcoming one),
// rehydrated to the full PlanResponse, plus its status and whether they have
// any plans at all. Home uses this to show the real current plan from the DB
// instead of regenerating from the profile, and to tell a brand-new user (no
// plans -> generate the first) from one who declined/used theirs (-> empty
// "request another" state, not a regenerated duplicate).

interface CurrentPlanResponse {
  plan: PlanResponse | null;
  status: PlanStatus | null;
  hasAnyPlans: boolean;
}

export async function GET() {
  const sb = await createClient();
  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { data: me, error: meErr } = await sb
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);

    if (!me) {
      const empty: CurrentPlanResponse = { plan: null, status: null, hasAnyPlans: false };
      return NextResponse.json(empty);
    }

    const [context, total] = await Promise.all([
      loadCurrentPlanContext(sb, me.id),
      countAllPlans(sb, me.id),
    ]);

    const body: CurrentPlanResponse = {
      plan: context ? buildPlanResponse(context.plan, context.requester, context.plan.planId) : null,
      status: context ? context.status : null,
      hasAnyPlans: total > 0,
    };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load current plan" },
      { status: 500 },
    );
  }
}
