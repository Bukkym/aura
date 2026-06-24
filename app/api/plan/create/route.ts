import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/lib/generatePlan";
import { persistPlan } from "@/lib/plans";
import { buildPlanResponse } from "@/lib/planResponse";
import { assignArchetype, loadArchetypeProfiles } from "@/lib/archetype";
import { userFromRow, deriveDisplayNameFromEmail } from "@/lib/userRow";
import type { LookingForExtracted, SelfExtracted, User } from "@/types";

// Re-exported for existing importers (live-plan, live-shell, useLivePlan) that
// reference these from this route. The definitions now live in lib/planResponse.
export type { AttendeeView, PlanResponse } from "@/lib/planResponse";

// POST /api/plan/create
//
// Body: { selfExtracted, lookingForExtracted }
// Side effects: upserts a public.users row tied to the caller's auth_user_id
//               (creates on first call, refreshes the chip arrays on later
//               calls so refinement reuses the same row).
// Returns: { plan: PlanResponse } with embeddings stripped.
//
// Module 3: NO OpenAI calls. The requester row is written with NULL embeddings
// (the columns are nullable as of the chip-onboarding migration); matching is
// deterministic structured overlap (see lib/match.ts + lib/generatePlan.ts).
// Module 4 will lazily backfill real embeddings for chip-onboarded users.
//
// Auth: defense in depth — middleware refreshes the cookie on every request,
// but this route still verifies via supabase.auth.getUser() before touching DB.

interface CreatePlanBody {
  selfExtracted?: SelfExtracted;
  lookingForExtracted?: LookingForExtracted;
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  if (!authUser) {
    return NextResponse.json(
      { error: "Not signed in" },
      { status: 401 },
    );
  }

  let body: CreatePlanBody;
  try {
    body = (await request.json()) as CreatePlanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.selfExtracted || !body.lookingForExtracted) {
    return NextResponse.json(
      { error: "Missing selfExtracted or lookingForExtracted" },
      { status: 400 },
    );
  }

  // --- Upsert the requester's public.users row --------------------------------
  //
  // displayName defaults to the email's local part with the first letter
  // capitalized ("alice.smith@example.com" → "Alice.smith"). User can rename
  // later. No embeddings are written (Module 3 is AI-free); the columns are
  // nullable.

  const displayName = deriveDisplayNameFromEmail(authUser.email);

  // Try to find an existing row first so we can preserve the same id across
  // calls (refinement reuses it). onConflict on auth_user_id would be cleaner
  // but supabase-js needs the uniqueness constraint to be declared, which it
  // is — keeping the explicit fetch + branch for readability.
  const { data: existing, error: lookupErr } = await sb
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

  const nowIso = new Date().toISOString();
  const rawInputs = existing?.raw_inputs ?? {
    selfDescription: "",
    lookingFor: "",
  };

  // Assign the user's cluster from their chips, so real users enter the same
  // archetype system as the seed pool (they were getting NULL). Best-effort: a
  // failure here must not block plan creation, so we keep any prior value.
  let archetype: string | null = existing?.archetype ?? null;
  try {
    const profiles = await loadArchetypeProfiles(sb);
    archetype = assignArchetype(body.selfExtracted, profiles) ?? archetype;
  } catch {
    // keep prior/null archetype
  }

  let requesterRow;
  if (existing) {
    const { data, error } = await sb
      .from("users")
      .update({
        display_name: displayName,
        self_extracted: body.selfExtracted,
        looking_for_extracted: body.lookingForExtracted,
        archetype,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: `User update failed: ${error?.message}` },
        { status: 500 },
      );
    }
    requesterRow = data;
  } else {
    const { data, error } = await sb
      .from("users")
      .insert({
        auth_user_id: authUser.id,
        display_name: displayName,
        city: "Berlin",
        raw_inputs: rawInputs,
        self_extracted: body.selfExtracted,
        looking_for_extracted: body.lookingForExtracted,
        archetype,
        created_at: nowIso,
      })
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: `User insert failed: ${error?.message}` },
        { status: 500 },
      );
    }
    requesterRow = data;
  }

  const requester: User = userFromRow(requesterRow);

  // --- Run the Plan pipeline --------------------------------------------

  const plan = await generatePlan(sb, requester);

  // --- Persist the plan -------------------------------------------------
  //
  // Write the generated plan to public.plans and use the stored row id as the
  // planId, so it can be confirmed and shown in the Plans tab history.
  // persistPlan dedupes against an existing upcoming plan, so repeat calls
  // reuse the same row.
  let persistedPlanId: string;
  try {
    persistedPlanId = await persistPlan(sb, plan);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save plan" },
      { status: 500 },
    );
  }

  // --- Slim the response ------------------------------------------------

  const response = buildPlanResponse(plan, requester, persistedPlanId);

  return NextResponse.json({ plan: response });
}
