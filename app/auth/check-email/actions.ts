"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Actions for the /auth/check-email screen.
//
// verifyCode is the pre-fetch-proof alternative to clicking the magic link:
// email scanners (Gmail, Outlook Safe Links, security suites) routinely
// pre-fetch URLs in incoming mail, consuming Supabase's single-use token
// before the user sees it. Typing the code into our form can't be
// pre-fetched. The token is the same OTP whether the user clicks the link
// or types the code; Supabase lets clients verify it either way.
//
// Operator note: the Supabase Dashboard's Magic Link email template must
// include {{ .Token }} for a code to appear in the email. The default
// template only renders the link.

export async function verifyCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").replace(/\s+/g, "");
  const next = String(formData.get("next") ?? "/");

  const safeNext = next.startsWith("/") ? next : "/";
  const back = (msg: string) => {
    const qs = new URLSearchParams({ email, next: safeNext, error: msg });
    redirect(`/auth/check-email?${qs.toString()}`);
  };

  if (!email) back("Your session expired. Start again from sign-in.");
  // Supabase OTP length is a dashboard setting (6 to 10 digits); accept the
  // full range so the form survives whatever the project is configured to send.
  if (!/^\d{6,10}$/.test(token)) {
    back("That code doesn't look right. Enter the digits from your email.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    back(error.message);
  }

  redirect(safeNext);
}

export async function resendCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "/");
  const safeNext = next.startsWith("/") ? next : "/";

  if (!email) {
    redirect("/auth/login");
  }

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    (hdrs.get("host") ? `https://${hdrs.get("host")}` : "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });

  const qs = new URLSearchParams({ email, next: safeNext });
  if (error) {
    qs.set("error", error.message);
  } else {
    qs.set("resent", "1");
  }
  redirect(`/auth/check-email?${qs.toString()}`);
}
