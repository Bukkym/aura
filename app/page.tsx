import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlanSummaries } from "@/lib/plans";
import { OnboardingFlow } from "@/components/aura/OnboardingFlow";

// The aura entry point: the onboarding spine (welcome, entry, voice, chips),
// recreated from design_handoff_aura and wired to the deterministic pipeline.
// On the final chip submit it writes the aura:draft profile and routes to /home.
//
// Returning users: if a signed-in user already has at least one plan, we send
// them back to /home (their last state) instead of restarting onboarding. A
// signed-in user with no plans yet still onboards so they can build their first.
export default async function HomePage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  // redirect() throws NEXT_REDIRECT, so it must run outside the try/catch or the
  // catch would swallow it. We only resolve the has-plans flag inside the guard.
  let hasPlans = false;
  if (user) {
    try {
      const plans = await listPlanSummaries(sb, user.id);
      hasPlans = plans.length > 0;
    } catch {
      // If the lookup fails, fall through to onboarding rather than blocking
      // entry. /home stays gated, so nothing sensitive is exposed.
    }
  }
  if (hasPlans) redirect("/home");

  return <OnboardingFlow />;
}
