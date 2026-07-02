import Link from "next/link";
import { redirect } from "next/navigation";
import { AuroraRing } from "@/components/AuroraRing";
import { createClient } from "@/lib/supabase/server";
import { sendMagicLink } from "./actions";
import { LoginErrorMessage } from "./LoginErrorMessage";

// Magic-link login. Server-rendered form, Server Action handles the
// signInWithOtp call. Errors come back via ?error= in the URL so we can
// stay fully server-rendered and skip useActionState ceremony.

interface PageProps {
  searchParams: Promise<{
    error?: string;
    next?: string;
    intent?: string;
    notfound?: string;
    email?: string;
  }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { error, next, intent, notfound, email } = await searchParams;
  const isSignup = intent === "signup";
  const notSignedUp = notfound === "1";

  // If already signed in, send the user wherever they were headed (or home).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(next ?? "/");
  }

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

      <Link
        href="/"
        className="absolute left-5 top-5 z-10 text-sm text-aura-ink/50 transition hover:text-aura-ink"
      >
        ← back
      </Link>

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={96} state="idle" />

        <h1 className="font-display mt-10 text-3xl font-medium tracking-tight text-aura-ink sm:text-4xl">
          {isSignup ? "Confirm your email" : "Welcome back"}
        </h1>
        <p className="mt-3 max-w-sm text-sm text-aura-ink/60">
          {isSignup
            ? "Enter your email. We'll send you a link and a code to finish setting up."
            : "Enter your email. We'll send you a link and a code to sign in."}
        </p>

        {notSignedUp ? (
          <div className="mt-10 flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-aura-ink/10 bg-aura-bg/40 px-6 py-7 text-center">
            <p className="text-sm text-aura-ink/70" role="alert">
              We couldn&apos;t find an account for{" "}
              {email ? (
                <span className="text-aura-ink/90">{email}</span>
              ) : (
                "that email"
              )}
              . Let&apos;s get you set up first.
            </p>
            <Link
              href="/"
              className="mt-1 inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-aura-bg transition hover:bg-ora-violet active:scale-[0.98]"
            >
              Begin
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-aura-ink/50 transition hover:text-aura-ink"
            >
              Try a different email
            </Link>
          </div>
        ) : (
          <form
            action={sendMagicLink}
            className="mt-10 flex w-full max-w-sm flex-col gap-3"
          >
            <input type="hidden" name="next" value={next ?? "/"} />
            {isSignup ? <input type="hidden" name="intent" value="signup" /> : null}
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={email ?? ""}
              placeholder="you@somewhere.com"
              aria-label="Email address"
              className="h-12 rounded-full border border-aura-ink/15 bg-aura-bg/60 px-5 text-base text-aura-ink placeholder-aura-ink/35 transition focus:border-aura-violet/60 focus:outline-none focus:ring-2 focus:ring-aura-violet/30"
            />
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-aura-bg transition hover:bg-ora-violet active:scale-[0.98]"
            >
              {isSignup ? "Send my code" : "Send me a link"}
            </button>
            <LoginErrorMessage initialError={error} />
          </form>
        )}
      </div>

      <span className="pointer-events-none absolute bottom-6 right-6 text-xs text-aura-ink/40">
        by Ora
      </span>
    </main>
  );
}
