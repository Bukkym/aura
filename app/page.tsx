import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileExists } from "@/lib/plans";
import { OnboardingFlow } from "@/components/aura/OnboardingFlow";

// The aura entry point: the onboarding spine (welcome, entry, voice, chips),
// recreated from design_handoff_aura and wired to the deterministic pipeline.
// On the final chip submit it writes the aura:draft profile and routes to /home.
//
// Returning users: route on onboarding completion (does a profile row exist),
// not on plan count. A signed-in user who already onboarded goes to /home even
// with zero active plans (e.g. their only plan was declined); /home shows the
// empty/forming state. Only a signed-in user with no profile yet onboards.
export default async function HomePage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  // redirect() throws NEXT_REDIRECT, so it must run outside the try/catch or the
  // catch would swallow it. We only resolve the has-profile flag inside the
  // guard. The lookup is a single indexed read, so a transient failure bouncing
  // a real user to onboarding is now unlikely; onboarding upserts (never wipes)
  // the existing profile row, so the fallthrough is non-destructive regardless.
  let hasProfile = false;
  if (user) {
    try {
      hasProfile = await profileExists(sb, user.id);
    } catch {
      // If the lookup fails, fall through to onboarding rather than blocking
      // entry. /home stays gated, so nothing sensitive is exposed.
    }
  }
  if (hasProfile) redirect("/home");

  return <OnboardingFlow />;
}
