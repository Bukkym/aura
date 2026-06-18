import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { declinePlan } from "@/lib/plans";

// POST /api/plan/decline
//
// Body: { planId }
// Marks the plan declined ("Not now"): it drops out of the user's active lists
// but stays on the row. RLS restricts the update to the plan's host, and
// getUser() verifies the session first.

interface DeclineBody {
  planId?: unknown;
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: DeclineBody;
  try {
    body = (await request.json()) as DeclineBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.planId !== "string" || body.planId.length === 0) {
    return NextResponse.json(
      { error: "Missing or invalid planId" },
      { status: 400 },
    );
  }

  try {
    await declinePlan(sb, body.planId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to decline plan" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
