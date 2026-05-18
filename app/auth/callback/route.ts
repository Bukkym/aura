import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing route. Supabase has two flavors of email link depending
// on the project's auth flow and email template:
//
//   PKCE (default with @supabase/ssr + the default email template using
//        {{ .ConfirmationURL }}):
//        the user lands here with `?code=…&next=…`. We exchange the code
//        for a session via supabase.auth.exchangeCodeForSession.
//
//   OTP / implicit (older flow or custom email template using
//        {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email):
//        the user lands here with `?token_hash=…&type=…&next=…`. We verify
//        via supabase.auth.verifyOtp.
//
// We handle both so the route doesn't break if the dashboard's email
// template gets swapped. Failure modes redirect to /auth/login?error=… so
// the user sees what went wrong.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Only allow same-origin redirect targets — defense against an open-redirect
  // attack if `next` ever flows in from an untrusted source.
  const safeNext = next.startsWith("/") ? next : "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error.message)}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error.message)}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=${encodeURIComponent("Invalid or missing sign-in link")}`,
  );
}
