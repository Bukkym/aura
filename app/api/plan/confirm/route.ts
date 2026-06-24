import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmPlan } from "@/lib/plans";

// POST /api/plan/confirm
//
// Body: { planId }
// Marks the plan confirmed (the requester accepted it with "I'm in"). RLS restricts
// the update to the plan's requester, and getUser() verifies the session first.

interface ConfirmBody {
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

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
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
    await confirmPlan(sb, body.planId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to confirm plan" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
