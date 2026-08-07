import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { journeyStep, dedupeCrew } from "@/lib/journey";

// GET /api/journey
// The signed-in user's crew-journey state for Home: whether they've committed to
// a crew, how far along (activity N of 5, from confirmed plans), and the people
// met so far.
export async function GET() {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: me } = await sb
      .from("users")
      .select("id, on_crew_journey")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!me) return NextResponse.json({ onCrewJourney: false, step: 0, crew: [] });

    const { data: plans } = await sb
      .from("plans")
      .select("attendee_user_ids, confirmed_at")
      .eq("created_for_user_id", me.id)
      .not("confirmed_at", "is", null)
      .order("confirmed_at", { ascending: false });

    const confirmed = plans ?? [];
    const step = journeyStep(confirmed.length);

    // Distinct attendee ids across confirmed plans, most-recent first.
    const ids: string[] = [];
    for (const p of confirmed) for (const id of (p.attendee_user_ids ?? []) as string[]) ids.push(id);

    let crew: { id: string; name: string }[] = [];
    if (ids.length > 0) {
      const uniq = [...new Set(ids)];
      const { data: people } = await sb.from("users").select("id, display_name").in("id", uniq);
      const nameById = new Map((people ?? []).map((u) => [u.id as string, u.display_name as string]));
      const ordered = ids
        .map((id) => ({ id, name: nameById.get(id) ?? "" }))
        .filter((m) => m.name.length > 0);
      crew = dedupeCrew(ordered, me.id, 4);
    }

    return NextResponse.json({ onCrewJourney: Boolean(me.on_crew_journey), step, crew });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
