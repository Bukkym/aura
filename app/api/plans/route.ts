import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listPlanSummaries, splitByTime } from "@/lib/plans";

// GET /api/plans
//
// Returns the signed-in user's hosted plans, split into { upcoming, past } for
// the Plans tab history. RLS scopes reads to the caller; getUser() verifies the
// session first.

export async function GET() {
  const sb = await createClient();
  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const summaries = await listPlanSummaries(sb, authUser.id);
    const { upcoming, past } = splitByTime(summaries, new Date().toISOString());
    return NextResponse.json({ upcoming, past });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load plans" },
      { status: 500 },
    );
  }
}
