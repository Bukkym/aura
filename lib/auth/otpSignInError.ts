// Signin-only OTP errors. When we call signInWithOtp with
// shouldCreateUser: false (the sign-in path, not the sign-up path), Supabase
// refuses to create a brand-new account and returns an error instead of
// sending a code. We use that to tell the user "you're not signed up yet"
// and point them at onboarding, rather than surfacing a raw Supabase string.
//
// GoTrue reports this case with the `otp_disabled` code and the message
// "Signups not allowed for otp". We also match a couple of neighbouring codes
// and a message fallback so a minor GoTrue version bump doesn't silently break
// the branch.

export interface OtpErrorLike {
  code?: string | null;
  status?: number | null;
  message?: string | null;
}

const UNKNOWN_USER_CODES = new Set([
  "otp_disabled",
  "signup_disabled",
  "user_not_found",
]);

// True when a shouldCreateUser: false sign-in failed because the email has no
// account. Only call this on the sign-in path; on the sign-up path
// shouldCreateUser is true, so this signal never fires.
export function isUnknownUserOtpError(error: OtpErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code && UNKNOWN_USER_CODES.has(error.code)) return true;
  const message = error.message?.toLowerCase() ?? "";
  return /signups?\s+not\s+allowed|user\s+not\s+found/.test(message);
}
