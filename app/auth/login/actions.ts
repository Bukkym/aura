"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUnknownUserOtpError } from "@/lib/auth/otpSignInError";

// Server Action invoked by app/auth/login/page.tsx form submission. Asks
// Supabase to send a magic link email; user clicks it, lands on
// /auth/callback, which exchanges the token for a session.
//
// We pull the request origin from the incoming Host/X-Forwarded-* headers
// so the same code works in dev (localhost), preview, and prod without an
// env var. Whichever origin we pass here also has to be in the Supabase
// project's allowed Redirect URLs list (Dashboard → Authentication → URL
// Configuration). For local dev: add http://localhost:3000.
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const nextPath = String(formData.get("next") ?? "/");
  // "signup" arrives only from the onboarding hand-off (the user has just
  // filled in their draft). Everything else is a sign-in: an existing account
  // is expected, so we do NOT let Supabase silently create a new one. That's
  // what surfaces the "you're not signed up yet" message below.
  const isSignup = String(formData.get("intent") ?? "") === "signup";

  if (!email) {
    const back = isSignup ? "&intent=signup" : "";
    redirect(`/auth/login?error=Please+enter+your+email${back}`);
  }

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    (hdrs.get("host") ? `https://${hdrs.get("host")}` : "");

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: isSignup,
      // Where Supabase sends the user after they click the email link.
      // We pass `next` along so the callback can redirect to the right
      // destination after exchanging the token.
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    // On the sign-in path, an unknown email means the person never onboarded.
    // Send them back with a dedicated flag so the page can point them at Begin
    // instead of showing a raw Supabase error.
    if (!isSignup && isUnknownUserOtpError(error)) {
      const qs = new URLSearchParams({ email, next: nextPath, notfound: "1" });
      redirect(`/auth/login?${qs.toString()}`);
    }
    const back = isSignup ? "&intent=signup" : "";
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}${back}`);
  }

  const qs = new URLSearchParams({ email, next: nextPath });
  redirect(`/auth/check-email?${qs.toString()}`);
}
