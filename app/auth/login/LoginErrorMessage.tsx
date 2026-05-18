"use client";

import { useEffect, useState } from "react";

// Two ways an error can land on /auth/login:
//
//   - As a query string (?error=…), set by our own /auth/callback when it
//     can't verify a sign-in (no code, exchange failed, etc.). Read on the
//     server in page.tsx and passed in as `initialError`.
//
//   - As a URL fragment (#error_code=…&error_description=…), set by
//     Supabase itself when it rejects the magic link before our callback
//     even sees it — e.g. otp_expired. The fragment is browser-only; the
//     server can't read it, so our callback redirected with the generic
//     "Invalid or missing sign-in link" message and the original fragment
//     was preserved by the browser through the redirect.
//
// This Client Component runs after hydration, parses the fragment if
// present, and shows whatever's more specific. It also clears the hash
// so refreshing the page doesn't keep displaying a stale error.

export function LoginErrorMessage({ initialError }: { initialError?: string }) {
  const [message, setMessage] = useState<string | undefined>(initialError);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("error")) return;

    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");

    if (errorCode === "otp_expired") {
      setMessage(
        "That sign-in link expired. Enter your email below and we'll send a fresh one.",
      );
    } else if (errorDescription) {
      // Supabase fragment values use + for spaces (URL form-encoded).
      setMessage(errorDescription.replace(/\+/g, " "));
    } else if (errorCode) {
      setMessage(`Sign-in failed: ${errorCode}`);
    }

    // Strip the fragment so a refresh doesn't re-show the error.
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);

  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-aura-violet" role="alert">
      {message}
    </p>
  );
}
