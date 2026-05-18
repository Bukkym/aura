import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embedBatch, stringifyExtractedForEmbed } from "@/lib/embed";
import { generatePlan } from "@/lib/generatePlan";
import { userFromRow } from "@/lib/userRow";
import type {
  LookingForExtracted,
  SelfExtracted,
  User,
  Match,
} from "@/types";

// POST /api/plan/create
//
// Body: { selfExtracted, lookingForExtracted }
// Side effects: upserts a public.users row tied to the caller's auth_user_id
//               (creates on first call, refreshes embeddings on subsequent calls
//               so refinement in Slice D works out of the box).
// Returns: { plan: PlanResponse } where PlanResponse strips embeddings to keep
//          the payload small (1536-dim vectors × 7 users would ship ~85kB of
//          floats the client never uses).
//
// Auth: defense in depth — middleware refreshes the cookie on every request,
// but this route still verifies via supabase.auth.getUser() before touching DB.

interface CreatePlanBody {
  selfExtracted?: SelfExtracted;
  lookingForExtracted?: LookingForExtracted;
}

export interface AttendeeView {
  userId: string;
  displayName: string;
  archetype?: string;
  selfExtracted: SelfExtracted;
  explanation: Match["explanations"];
}

export interface PlanResponse {
  planId: string;
  hostUserId: string;
  hostDisplayName: string;
  activityType: string;
  place: {
    id: string;
    name: string;
    type: string;
    neighborhood: string;
    description: string;
  };
  dateTime: string;
  vibe: string[];
  attendees: AttendeeView[];
  whyThisPlan: string;
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

  // --- Embed both layers in one OpenAI call ------------------------------

  const [selfEmbedding, lookingForEmbedding] = await embedBatch([
    stringifyExtractedForEmbed(body.selfExtracted),
    stringifyExtractedForEmbed(body.lookingForExtracted),
  ]);

  // --- Upsert the host's public.users row --------------------------------
  //
  // displayName defaults to the email's local part with the first letter
  // capitalized ("alice.smith@example.com" → "Alice.smith"). User can rename
  // later. Real-name editing is a polish concern, not Slice B.

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

  let hostRow;
  if (existing) {
    const { data, error } = await sb
      .from("users")
      .update({
        display_name: displayName,
        self_extracted: body.selfExtracted,
        looking_for_extracted: body.lookingForExtracted,
        self_embedding: JSON.stringify(selfEmbedding),
        looking_for_embedding: JSON.stringify(lookingForEmbedding),
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
    hostRow = data;
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
        self_embedding: JSON.stringify(selfEmbedding),
        looking_for_embedding: JSON.stringify(lookingForEmbedding),
        archetype: null,
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
    hostRow = data;
  }

  const host: User = userFromRow(hostRow);

  // --- Run the Plan pipeline --------------------------------------------

  const plan = await generatePlan(sb, host);

  // --- Slim the response ------------------------------------------------

  const response: PlanResponse = {
    planId: plan.planId,
    hostUserId: plan.hostUserId,
    hostDisplayName: host.displayName,
    activityType: plan.activityType,
    place: {
      id: plan.place.id,
      name: plan.place.name,
      type: plan.place.type,
      neighborhood: plan.place.neighborhood,
      description: plan.place.description,
    },
    dateTime: plan.dateTime,
    vibe: plan.vibe,
    attendees: plan.attendees.map((a) => ({
      userId: a.userId,
      displayName: a.displayName,
      archetype: a._archetype,
      selfExtracted: a.selfExtracted,
      explanation: explain(host, a),
    })),
    whyThisPlan: plan.whyThisPlan,
  };

  return NextResponse.json({ plan: response });
}

function deriveDisplayNameFromEmail(email: string | undefined): string {
  if (!email) return "Friend";
  const local = email.split("@")[0] ?? "Friend";
  if (!local) return "Friend";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// Same shape as lib/match.ts explain(). Inlined here because the API
// returns AttendeeView with a precomputed explanation, and exposing
// match.ts's internal helper would couple the two unnecessarily.
function explain(a: User, b: User): Match["explanations"] {
  const intersect = (xs: string[], ys: string[]) =>
    xs.filter((x) => ys.includes(x));
  return {
    sharedInterests: intersect(
      a.selfExtracted.interests,
      b.selfExtracted.interests,
    ),
    sharedActivityTypes: intersect(
      a.selfExtracted.activityTypes,
      b.selfExtracted.activityTypes,
    ),
    sharedSocialPreferences: intersect(
      a.selfExtracted.socialPreferences,
      b.selfExtracted.socialPreferences,
    ),
    sharedLifeContext: intersect(
      a.selfExtracted.lifeContext,
      b.selfExtracted.lifeContext,
    ),
    matchedPersonalityTraits: intersect(
      a.lookingForExtracted.personality,
      b.selfExtracted.personality,
    ),
  };
}
