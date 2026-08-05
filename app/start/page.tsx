import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileExists } from "@/lib/plans";
import { OnboardingFlow } from "@/components/aura/OnboardingFlow";

// The onboarding entry, reached from the landing "Get your first plan" CTA.
// Signed-in users who already onboarded skip to /home; everyone else runs the
// onboarding spine. On completion OnboardingFlow hands off through the auth gate
// to /home.
export default async function StartPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  let hasProfile = false;
  if (user) {
    try {
      hasProfile = await profileExists(sb, user.id);
    } catch {
      // fall through to onboarding
    }
  }
  if (hasProfile) redirect("/home");

  return <OnboardingFlow />;
}
