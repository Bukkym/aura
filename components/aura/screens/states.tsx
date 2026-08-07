"use client";

// Shared non-card states for the live app shell (the "finding" Ora moment, the
// no-draft nudge, the error state). Each renders the inner cream screen; the
// page wraps it in <PhoneFrame>.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ring, OraBloom } from "../primitives";

const FINDING_STEPS = ["Reading your aura", "Finding the few who truly fit", "Bringing your people together"];

// The earned wait: processing ring + localized bloom + cycling status, no
// auto-advance (the fetch decides when we're done).
export function FindingMoment() {
  return <ProcessingBeat steps={FINDING_STEPS} />;
}

const FORMING_STEPS = [
  "Reading your aura",
  "Finding the few who truly fit",
  "Bringing your people together",
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
        <p key={i} style={{ marginTop: 38, fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 22, color: "var(--aura-ink-90)", lineHeight: 1.3, letterSpacing: "-0.01em", animation: "flowFade 500ms ease both" }}>
          {steps[i]}
        </p>
        <p style={{ marginTop: 8, fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--aura-ink-55)" }}>
          Finding your people, and why.
        </p>
      </div>
    </div>
  );
}

export function NoDraftState({ href = "/start" }: { href?: string }) {
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.5, filter: "blur(64px)" }} />
      <div style={{ position: "relative" }}>
        <Ring size={96} state="idle" />
        <div style={{ marginTop: 24, fontFamily: "var(--font-serif)", fontSize: 22 }}>
          <span style={{ color: "var(--aura-persimmon)", fontWeight: 400 }}>a</span>ura
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em", margin: "18px 0 6px" }}>Let&apos;s start with you.</h1>
        <p style={{ fontSize: 14, color: "var(--aura-ink-55)", margin: "0 auto", maxWidth: 280, lineHeight: 1.5 }}>Tell Ora a bit about you first, then it&apos;ll find your crew.</p>
        <Link href={href} style={{ marginTop: 28, display: "inline-block", background: "var(--aura-ink)", color: "var(--aura-bg)", padding: "13px 44px", borderRadius: 16, fontSize: 14.5, fontWeight: 600, textDecoration: "none" }}>
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
        <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 25, letterSpacing: "-0.01em", margin: "22px 0 6px" }}>No plan in front of you.</h1>
        <p style={{ fontSize: 14, color: "var(--aura-ink-55)", margin: "0 auto", maxWidth: 290, lineHeight: 1.5 }}>Ora keeps one good plan at a time. Ask for another whenever you want something different.</p>
        {onSeePlans && (
          <button onClick={onSeePlans} style={{ marginTop: 26, cursor: "pointer", border: "none", background: "var(--aura-ink)", color: "var(--aura-bg)", padding: "13px 40px", borderRadius: 16, fontSize: 14.5, fontWeight: 600 }}>
            Ask Ora for another
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
        <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em", margin: "24px 0 6px" }}>Something didn&apos;t land.</h1>
        <p style={{ fontSize: 14, color: "var(--aura-ink-55)", margin: "0 auto", maxWidth: 300, lineHeight: 1.5 }}>{message}</p>
        <Link href={href} style={{ marginTop: 24, display: "inline-flex", color: "var(--aura-ink-55)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
          ← Start over
        </Link>
      </div>
    </div>
  );
}
