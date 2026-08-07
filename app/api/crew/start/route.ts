import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/crew/start
// Commit the signed-in user to the 5-plan crew journey (flips Home into crew
// mode). Called from "Start a crew" on Home and the journey option at checkout.
export async function POST() {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { error } = await sb
      .from("users")
      .update({ on_crew_journey: true })
      .eq("auth_user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
