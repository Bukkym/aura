"use client";

import { useFormStatus } from "react-dom";
import { verifyCode, resendCode } from "./actions";

// Client wrapper for the sign-in code entry + resend, so we can show a
// pending state on submit (useFormStatus must run inside a <form>'s
// descendant). The Server Actions themselves live in actions.ts.

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-aura-bg transition hover:bg-ora-violet active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Checking..." : "Continue →"}
    </button>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm text-aura-ink/55 underline-offset-4 transition hover:text-aura-ink hover:underline disabled:opacity-60"
    >
      {pending ? "Sending..." : "Resend code"}
    </button>
  );
}

export function CodeForm({
  email,
  next,
}: {
  email: string;
  next: string;
}) {
  return (
    <>
      <form
        action={verifyCode}
        className="mt-8 flex w-full max-w-sm flex-col gap-3"
      >
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <input
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6,10}"
          maxLength={10}
          required
          placeholder="12345678"
          aria-label="Sign-in code from your email"
          className="h-12 rounded-full border border-aura-ink/15 bg-aura-bg/60 px-5 text-center text-lg tracking-[0.4em] text-aura-ink placeholder-aura-ink/30 transition focus:border-aura-violet/60 focus:outline-none focus:ring-2 focus:ring-aura-violet/30"
        />
        <SubmitButton />
      </form>

      <form action={resendCode} className="mt-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <ResendButton />
      </form>
    </>
  );
}
