"use client";

// Shared non-card states for the live app shell (the "finding" Ora moment, the
// no-draft nudge, the error state). Each renders the inner cream screen; the
// page wraps it in <PhoneFrame>.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ring, OraBloom, Wordmark } from "../primitives";

const FINDING_STEPS = ["Reading your aura…", "Looking across Berlin…", "Finding the few who truly fit…"];

// The earned wait: processing ring + localized bloom + cycling status, no
// auto-advance (the fetch decides when we're done).
export function FindingMoment() {
  return <ProcessingBeat steps={FINDING_STEPS} />;
}

const FORMING_STEPS = [
  "Reading your aura…",
  "Looking across Berlin…",
  "Finding the few who truly fit…",
  "Bringing your group together…",
];

// The deliberate "forming" beat shown once when a Plan is freshly built. Same
// processing visual as FindingMoment, but a fuller narrative that ends on the
// group coming together. useLivePlan holds this for a minimum duration so a
// just-built Plan never appears instantly (instant reads as canned); a warm
// cache skips it entirely, so it doesn't replay on revisits. The real wait
// (minutes, a nudge when ready) lands once matching depends on other people.
export function FormingMoment() {
  return <ProcessingBeat steps={FORMING_STEPS} intervalMs={1700} />;
}

function ProcessingBeat({ steps, intervalMs = 1600 }: { steps: string[]; intervalMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % steps.length), intervalMs);
    return () => clearInterval(id);
  }, [steps.length, intervalMs]);
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <OraBloom show />
      <div style={{ position: "relative", textAlign: "center", padding: "0 36px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Ring size={140} state="processing" dark />
        </div>
        <p key={i} style={{ marginTop: 38, fontFamily: "var(--font-body)", fontSize: 16.5, color: "var(--aura-ink-90)", lineHeight: 1.4, animation: "flowFade 500ms ease both" }}>
          {steps[i]}
        </p>
      </div>
    </div>
  );
}

export function NoDraftState({ href = "/" }: { href?: string }) {
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
        <Link href={href} className="btn btn--aurora" style={{ marginTop: 28, display: "inline-flex", textDecoration: "none", padding: "0 48px" }}>
          Begin
        </Link>
      </div>
    </div>
  );
}

// Shown when the user has no active plan (they declined or used theirs) but is
// not a brand-new user, so we don't regenerate one. Points them to where they
// can ask Ora for another.
export function EmptyPlanState({ onSeePlans }: { onSeePlans?: () => void }) {
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.45, filter: "blur(64px)" }} />
      <div style={{ position: "relative" }}>
        <Ring size={92} state="rest" />
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 25, letterSpacing: "-0.01em", margin: "22px 0 6px" }}>No Plan in front of you.</h1>
        <p style={{ fontSize: 14, color: "var(--aura-ink-70)", margin: "0 auto", maxWidth: 290, lineHeight: 1.5 }}>Ora keeps one good Plan at a time. Ask for another whenever you want something different.</p>
        {onSeePlans && (
          <button onClick={onSeePlans} className="btn btn--aurora" style={{ marginTop: 26, padding: "0 44px" }}>
            Ask Ora for another →
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorState({ message, href = "/" }: { message: string; href?: string }) {
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.5, filter: "blur(64px)" }} />
      <div style={{ position: "relative" }}>
        <Ring size={96} state="idle" />
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em", margin: "24px 0 6px" }}>Something didn&apos;t land.</h1>
        <p style={{ fontSize: 14, color: "var(--aura-ink-70)", margin: "0 auto", maxWidth: 300, lineHeight: 1.5 }}>{message}</p>
        <Link href={href} className="btn btn--ghost" style={{ marginTop: 24, display: "inline-flex", color: "var(--aura-violet)", textDecoration: "none" }}>
          ← start over
        </Link>
      </div>
    </div>
  );
}
