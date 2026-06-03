"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuroraRing } from "@/components/AuroraRing";
import { SignOutButton } from "@/components/SignOutButton";
import type {
  LookingForExtracted,
  SelfExtracted,
} from "@/types";
import type { PlanResponse } from "../api/plan/create/route";
import { PlanCard } from "./PlanCard";

// Screen 5 wrapper: drives the fetch + Ora moment + edge states. The card
// itself lives in PlanCard.tsx so /plan-demo can render it without going
// through the fetch.
//
// Flow:
//   1. On mount, read aura:draft from sessionStorage (set by /chips).
//   2. If absent, show a friendly nudge to start at /voice.
//   3. If present, POST to /api/plan/create — this triggers the Ora moment.
//   4. On success, render PlanCard.
//
// Refinement controls (inline refinement chips + free-form text) and the
// "Why these six?" dev panel are deferred to Slice D.

const STORAGE_KEY = "aura:draft";

interface Draft {
  selfExtracted: SelfExtracted;
  lookingForExtracted: LookingForExtracted;
}

type Phase =
  | { kind: "loading" }
  | { kind: "no-draft" }
  | { kind: "generating" }
  | { kind: "error"; message: string }
  | { kind: "ready"; plan: PlanResponse };

export function PlanScreen() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let draft: Draft | null = null;
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) draft = JSON.parse(raw) as Draft;
      } catch {
        // ignore, treat as no draft
      }
      if (!draft) {
        if (!cancelled) setPhase({ kind: "no-draft" });
        return;
      }

      if (!cancelled) setPhase({ kind: "generating" });
      try {
        const res = await fetch("/api/plan/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(
            detail?.error ?? `Request failed: ${res.status}`,
          );
        }
        const { plan } = (await res.json()) as { plan: PlanResponse };
        if (!cancelled) setPhase({ kind: "ready", plan });
      } catch (err) {
        if (!cancelled) {
          setPhase({
            kind: "error",
            message: err instanceof Error ? err.message : "Something went wrong",
          });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  let screen;
  if (phase.kind === "loading" || phase.kind === "generating") {
    screen = <OraMoment />;
  } else if (phase.kind === "no-draft") {
    screen = <NoDraft />;
  } else if (phase.kind === "error") {
    screen = <ErrorState message={phase.message} />;
  } else {
    screen = <PlanCard plan={phase.plan} />;
  }

  // This wrapper only renders on the authed /plan route, so sign-out belongs
  // here. Fixed top-right, clear of PlanCard's top-left back link and the
  // bottom-right "by Ora" mark.
  return (
    <>
      {screen}
      <div className="fixed right-5 top-5 z-20">
        <SignOutButton />
      </div>
    </>
  );
}

function OraMoment() {
  // Pure luminous bloom on cream — see app/voice/page.tsx for the reasoning.
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(45% 45% at 25% 25%, rgba(255, 123, 172, 0.22) 0%, transparent 70%), radial-gradient(40% 40% at 75% 75%, rgba(201, 125, 255, 0.18) 0%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-fade-in"
        style={{
          background: `
            radial-gradient(circle at 50% 42%, rgba(162, 55, 255, 0.50) 0%, transparent 18%),
            radial-gradient(circle at 50% 42%, rgba(255, 61, 154, 0.35) 0%, transparent 30%),
            radial-gradient(circle at 50% 42%, rgba(201, 125, 255, 0.22) 0%, transparent 50%)
          `,
        }}
      />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={200} state="processing" />
        <p className="mt-12 text-base text-aura-ink/55">
          Finding your first Plan...
        </p>
      </div>
    </main>
  );
}

function NoDraft() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={96} state="idle" />
        <h1 className="font-display mt-8 text-3xl font-medium tracking-tight">
          Let&apos;s start with you.
        </h1>
        <p className="mt-3 max-w-sm text-sm text-aura-ink/60">
          Tell me a bit about yourself first, then I&apos;ll find your people.
        </p>
        <Link
          href="/voice"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-aura-bg transition hover:bg-ora-violet"
        >
          Begin
        </Link>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={96} state="idle" />
        <h1 className="font-display mt-8 text-3xl font-medium tracking-tight">
          Something didn&apos;t land.
        </h1>
        <p className="mt-3 max-w-sm text-sm text-aura-ink/60">{message}</p>
        <Link
          href="/chips"
          className="mt-10 text-sm text-aura-ink/55 underline-offset-4 transition hover:text-aura-ink hover:underline"
        >
          ← back to chips
        </Link>
      </div>
    </main>
  );
}
