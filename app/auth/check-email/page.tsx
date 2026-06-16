import Link from "next/link";
import { AuroraRing } from "@/components/AuroraRing";
import { CodeForm } from "./CodeForm";

// Step 2 of magic-link sign-in. Two ways forward:
//   1. Click the link in the email → /auth/callback → next
//   2. Paste the code from the email → verifyCode Server Action → next
//
// Path 2 exists because email scanners pre-fetch URLs and consume the
// single-use token before the user clicks. Typing a code can't be
// pre-fetched. See ./actions.ts for the operator note about the email
// template needing {{ .Token }}.

interface PageProps {
  searchParams: Promise<{
    email?: string;
    next?: string;
    error?: string;
    resent?: string;
  }>;
}

export default async function CheckEmailPage({ searchParams }: PageProps) {
  const { email, next, error, resent } = await searchParams;
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
          {safeEmail ? (
            <>
              We sent a sign-in link and a code to{" "}
              <span className="text-aura-ink/80">{safeEmail}</span>.
            </>
          ) : (
            <>We sent you a sign-in link and a code.</>
          )}
        </p>
        <p className="mt-2 max-w-sm text-sm text-aura-ink/50">
          Click the link, or paste the code below.
        </p>

        <CodeForm email={safeEmail} next={safeNext} />

        {resent && !error && (
          <p className="mt-4 max-w-sm text-sm text-aura-ink/60" role="status">
            Fresh code sent. Check your inbox.
          </p>
        )}
        {error && (
          <p className="mt-4 max-w-sm text-sm text-aura-violet" role="alert">
            {error}
          </p>
        )}

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
