"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  if (!email) {
    redirect("/auth/login?error=Please+enter+your+email");
  }

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    (hdrs.get("host") ? `https://${hdrs.get("host")}` : "");

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Where Supabase sends the user after they click the email link.
      // We pass `next` along so the callback can redirect to the right
      // destination after exchanging the token.
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}
