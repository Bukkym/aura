import Link from "next/link";
import { AuroraRing } from "@/components/AuroraRing";
import { verifyCode } from "./actions";

// Step 2 of magic-link sign-in. Two paths from here:
//
//   1. Click the link in the email → Supabase verify → /auth/callback → next
//   2. Paste the 6-digit code from the email body → verifyCode Server Action
//      → /auth/callback's equivalent → next
//
// Path #2 exists because email scanners (Gmail's, Outlook Safe Links,
// security suites) frequently pre-fetch URLs in incoming mail to check
// for phishing, which consumes Supabase's single-use token before the
// user even sees the email. Typing a code in our form can't be
// pre-fetched. The token is the same OTP either way — same lifetime,
// same Supabase row — Supabase just lets clients verify it via either
// the URL or `verifyOtp({ email, token })`.
//
// Operator note: the Supabase Dashboard's Magic Link email template
// must include `{{ .Token }}` for the code path to actually show a code
// in the email. The default template only includes the link.

interface PageProps {
  searchParams: Promise<{
    email?: string;
    next?: string;
    error?: string;
  }>;
}

export default async function CheckEmailPage({ searchParams }: PageProps) {
  const { email, next, error } = await searchParams;
  const safeEmail = email ?? "";
  const safeNext = next ?? "/";

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 25% 20%, rgba(255, 123, 172, 0.28) 0%, transparent 65%), radial-gradient(45% 45% at 80% 30%, rgba(201, 125, 255, 0.22) 0%, transparent 70%), radial-gradient(40% 40% at 60% 90%, rgba(119, 82, 230, 0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={96} state="rest" />

        <h1 className="font-display mt-10 text-3xl font-medium tracking-tight text-aura-ink sm:text-4xl">
          Check your email
        </h1>
        <p className="mt-4 max-w-sm text-sm text-aura-ink/60">
          {email ? (
            <>
              We sent a sign-in link and a 6-digit code to{" "}
              <span className="text-aura-ink/80">{email}</span>.
            </>
          ) : (
            <>We sent you a sign-in link and a 6-digit code.</>
          )}
        </p>
        <p className="mt-2 max-w-sm text-sm text-aura-ink/50">
          Click the link, or paste the code below.
        </p>

        <form
          action={verifyCode}
          className="mt-8 flex w-full max-w-sm flex-col gap-3"
        >
          <input type="hidden" name="email" value={safeEmail} />
          <input type="hidden" name="next" value={safeNext} />
          <input
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={7}
            required
            placeholder="123456"
            aria-label="6-digit code"
            className="h-12 rounded-full border border-aura-ink/15 bg-aura-bg/60 px-5 text-center text-base tracking-[0.4em] text-aura-ink placeholder-aura-ink/30 transition focus:border-aura-violet/60 focus:outline-none focus:ring-2 focus:ring-aura-violet/30"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-aura-bg transition hover:bg-ora-violet active:scale-[0.98]"
          >
            Continue →
          </button>
          {error && (
            <p className="mt-1 text-sm text-aura-violet" role="alert">
              {error}
            </p>
          )}
        </form>

        <Link
          href="/auth/login"
          className="mt-8 text-sm text-aura-ink/55 underline-offset-4 transition hover:text-aura-ink hover:underline"
        >
          Use a different email
        </Link>
      </div>

      <span className="pointer-events-none absolute bottom-6 right-6 text-xs text-aura-ink/40">
        by Ora
      </span>
    </main>
  );
}
