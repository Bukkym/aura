import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildFeedbackRows } from "@/lib/feedback";

// POST /api/plan/feedback
// Body: { planId: string, picks: Record<string /* users.id */, boolean> }
// Records the authenticated rater's directional post-plan feedback (who they'd
// meet again). Upserts on (plan_id, rater_id, ratee_id) so re-submitting edits
// rather than duplicates. Thin wrapper: validate → buildFeedbackRows → write.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { planId?: unknown; picks?: unknown }
      | null;

    const planId = body?.planId;
    const picks = body?.picks;
    if (typeof planId !== "string" || planId.length === 0) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }
    if (!picks || typeof picks !== "object" || Array.isArray(picks)) {
      return NextResponse.json(
        { error: "picks must be an object of { userId: boolean }" },
        { status: 400 },
      );
    }

    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: me, error: meErr } = await sb
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 500 });
    }
    if (!me) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const rows = buildFeedbackRows(planId, me.id, picks as Record<string, boolean>);
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, recorded: 0 });
    }

    const { error } = await sb
      .from("plan_feedback")
      .upsert(rows, { onConflict: "plan_id,rater_id,ratee_id" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, recorded: rows.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
