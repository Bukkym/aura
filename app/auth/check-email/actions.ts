"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Action invoked when the user pastes the 6-digit code from the
// magic-link email into the form on /auth/check-email. This is the
// pre-fetch-proof alternative to clicking the link: email scanners
// (Gmail, Outlook Safe Links, Bitdefender, etc.) can consume URLs but
// can't type codes into our form. The token is the same OTP whether the
// user clicks the link or types the digits — Supabase issues both per
// signInWithOtp call.

export async function verifyCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const tokenRaw = String(formData.get("token") ?? "");
  const token = tokenRaw.replace(/\s+/g, ""); // strip spaces if user types "123 456"
  const next = String(formData.get("next") ?? "/");

  const back = (errorMessage: string) => {
    const qs = new URLSearchParams({
      email,
      next,
      error: errorMessage,
    });
    redirect(`/auth/check-email?${qs.toString()}`);
  };

  if (!email) back("Missing email. Start again from sign-in.");
  if (!/^\d{6}$/.test(token))
    back("That doesn't look like a 6-digit code. Check your email and try again.");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    back(error.message);
  }

  const safeNext = next.startsWith("/") ? next : "/";
  redirect(safeNext);
}
