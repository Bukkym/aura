import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileExists } from "@/lib/plans";
import { Landing } from "@/components/landing/Landing";

// Public landing page (Warm Aurora, soft edition). Shown to logged-out and
// not-yet-onboarded visitors. Signed-in users who already onboarded skip
// straight to /home. The "Get your first plan" CTA routes into onboarding at
// /start.
//
// redirect() throws NEXT_REDIRECT, so it runs outside the try/catch; the
// profile lookup is a single indexed read, and a transient failure just leaves
// the visitor on the landing page (non-destructive).
export default async function HomePage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  let hasProfile = false;
  if (user) {
    try {
      hasProfile = await profileExists(sb, user.id);
    } catch {
      // fall through to the landing page
    }
  }
  if (hasProfile) redirect("/home");

  return <Landing />;
}
