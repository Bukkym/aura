import { createClient } from "@/lib/supabase/admin";
import { generatePlan } from "@/lib/generatePlan";
import { userFromRow } from "@/lib/userRow";
import type { Match } from "@/types";
import type { PlanResponse } from "../api/plan/create/route";
import { PlanCard } from "../plan/PlanCard";

// Demo route — bypasses auth and renders a full Plan card for a seeded
// user (Sofia, an ambitious-creator). Useful for reviewing the visual
// design without going through the voice → chips → magic-link → /plan
// flow.
//
// Server Component so we can do the OpenAI + DB work at request time and
// hand the finished PlanResponse to the shared PlanCard render. Uses the
// admin Supabase client to keep things simple (users + places are
// publicly readable, but this route shouldn't need to think about RLS).
//
// Force-dynamic so each visit generates a fresh Plan against the live
// data. Each render costs ~one embedding + one chat completion (~$0.001).

export const dynamic = "force-dynamic";

const HOST_DISPLAY_NAME = "Sofia";

export default async function PlanDemoPage() {
  const sb = createClient();

  const { data: row, error } = await sb
    .from("users")
    .select("*")
    .eq("display_name", HOST_DISPLAY_NAME)
    .limit(1)
    .maybeSingle();

  if (error || !row) {
    throw new Error(
      `Demo host '${HOST_DISPLAY_NAME}' not found in users table. Did the seed migration run? (${error?.message ?? "no row returned"})`,
    );
  }

  const host = userFromRow(row);
  const plan = await generatePlan(sb, host);

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

  return <PlanCard plan={response} backHref="/" />;
}

// Identical to the explain() in /api/plan/create/route.ts. Inlined here
// because the demo route doesn't go through the API; both copies share
// the same shape via Match["explanations"]. If a third caller appears,
// extract into a shared helper.
function explain(a: ReturnType<typeof userFromRow>, b: ReturnType<typeof userFromRow>): Match["explanations"] {
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
