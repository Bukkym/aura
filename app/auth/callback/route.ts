import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing route. Supabase sends users here with `token_hash`,
// `type`, and our `next` passthrough on the query string. We exchange the
// token for a session (which sets the auth cookies via the server client's
// cookie adapter), then redirect to `next`.
//
// Failure modes redirect to /auth/login?error=… so the user can retry.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent("Invalid or missing sign-in link")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Only allow same-origin redirect targets — defense against an open-redirect
  // attack if `next` ever flows in from an untrusted source.
  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
