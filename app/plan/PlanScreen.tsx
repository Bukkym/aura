"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ring, OraBloom, Wordmark } from "@/components/aura/primitives";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { LivePlanCard } from "@/components/aura/screens/live-plan";
import { SignOutButton } from "@/components/SignOutButton";
import type { LookingForExtracted, SelfExtracted } from "@/types";
import type { PlanResponse } from "../api/plan/create/route";

// Screen 5 wrapper: drives the fetch + the "finding" Ora moment + edge states,
// inside the shared mobile column. The deterministic pipeline runs server-side
// in /api/plan/create; this just reads aura:draft (written by the onboarding
// flow at /), POSTs it, and renders the live Plan card.

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
          throw new Error(detail?.error ?? `Request failed: ${res.status}`);
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

  let screen: React.ReactNode;
  if (phase.kind === "loading" || phase.kind === "generating") screen = <FindingMoment />;
  else if (phase.kind === "no-draft") screen = <NoDraft />;
  else if (phase.kind === "error") screen = <ErrorState message={phase.message} />;
  else screen = <LivePlanCard plan={phase.plan} />;

  return (
    <PhoneFrame
      screenKey={phase.kind}
      overlay={
        <div style={{ position: "absolute", bottom: 16, left: 18, zIndex: 40 }}>
          <SignOutButton />
        </div>
      }
    >
      {screen}
    </PhoneFrame>
  );
}

// The earned wait: processing ring + localized bloom + cycling status, no
// auto-advance (the fetch decides when we're done).
const FINDING_STEPS = ["Reading your aura…", "Looking across Berlin…", "Finding the few who truly fit…"];
function FindingMoment() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % FINDING_STEPS.length), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <OraBloom show />
      <div style={{ position: "relative", textAlign: "center", padding: "0 36px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Ring size={140} state="processing" dark />
        </div>
        <p key={i} style={{ marginTop: 38, fontFamily: "var(--font-body)", fontSize: 16.5, color: "var(--aura-ink-90)", lineHeight: 1.4, animation: "flowFade 500ms ease both" }}>
          {FINDING_STEPS[i]}
        </p>
      </div>
    </div>
  );
}

function NoDraft() {
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.5, filter: "blur(64px)" }} />
      <div style={{ position: "relative" }}>
        <Ring size={96} state="idle" />
        <div style={{ marginTop: 24 }}>
          <Wordmark size={40} />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em", margin: "18px 0 6px" }}>Let&apos;s start with you.</h1>
        <p style={{ fontSize: 14, color: "var(--aura-ink-70)", margin: "0 auto", maxWidth: 280, lineHeight: 1.5 }}>Tell me a bit about yourself first, then I&apos;ll find your people.</p>
        <Link href="/" className="btn btn--aurora" style={{ marginTop: 28, display: "inline-flex", textDecoration: "none", padding: "0 48px" }}>
          Begin
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.5, filter: "blur(64px)" }} />
      <div style={{ position: "relative" }}>
        <Ring size={96} state="idle" />
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em", margin: "24px 0 6px" }}>Something didn&apos;t land.</h1>
        <p style={{ fontSize: 14, color: "var(--aura-ink-70)", margin: "0 auto", maxWidth: 300, lineHeight: 1.5 }}>{message}</p>
        <Link href="/" className="btn btn--ghost" style={{ marginTop: 24, display: "inline-flex", color: "var(--aura-violet)", textDecoration: "none" }}>
          ← start over
        </Link>
      </div>
    </div>
  );
}
