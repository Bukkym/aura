"use client";

// aura — Plan card (mobile, the "postcard" header the flow uses). Description
// leads each intro, the name is a quiet byline, Ora's aside is always present.
// A stack of intros, never a contact list. No match percentages, ever.

import { CSSProperties, ReactNode, useState } from "react";
import { Ring, Swatch, Cal, Pin, Vibe, StatusTag, StatusIcon, auraHue, tintChip, mono } from "../primitives";
import { PLAN, PEOPLE, RSVP, Person } from "../data";

const mCard: CSSProperties = {
  background: "var(--aura-bg)",
  border: "1px solid var(--aura-ink-10)",
  borderRadius: 22,
  boxShadow: "var(--shadow-card)",
  width: "100%",
  overflow: "hidden",
};
const mHead: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: 22,
  margin: "0 0 18px",
  textAlign: "center",
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
};

// Cream surface that fills the phone content area.
function MobileSurface({ children, bloom = "plan" }: { children: ReactNode; bloom?: "plan" | "welcome" }) {
  const bg =
    bloom === "welcome"
      ? { background: "var(--bloom-welcome)", opacity: 0.6 }
      : { background: "var(--bloom-plan)", opacity: 0.55 };
  return (
    <div style={{ position: "relative", minHeight: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "blur(64px)", ...bg }} />
      <div style={{ position: "relative", zIndex: 1, padding: "58px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>{children}</div>
      <span className="by-ora" style={{ position: "absolute", bottom: 40, right: 20 }}>
        by Ora
      </span>
    </div>
  );
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const sharedOf = (p: Person) => {
  const d = p.detail.find((x) => /both into/i.test(x[0]));
  return d ? d[1].split(/,\s*/) : [];
};
const showUpOf = (p: Person) => {
  const d = p.detail.find((x) => /show up/i.test(x[0]));
  return d ? d[1] : "";
};

// Per-person intro card. Description leads, name is a byline, Ora's aside present.
function PersonIntro({ p }: { p: Person }) {
  const [open, setOpen] = useState(false);
  const hue = auraHue(p.id);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        position: "relative",
        background: `oklch(0.967 0.02 ${hue})`,
        border: `1px solid oklch(0.91 0.03 ${hue})`,
        borderRadius: 18,
        padding: "14px 15px",
        marginBottom: 10,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          fontSize: 16,
          lineHeight: 1,
          color: `oklch(0.6 0.1 ${hue})`,
          transform: open ? "rotate(90deg)" : "none",
          transition: "transform 240ms var(--ease-out)",
        }}
      >
        →
      </span>
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <Swatch id={p.id} size={42} />
        <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: `oklch(0.5 0.13 ${hue})` }}>{p.name}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.42, color: "var(--aura-ink-90)", marginTop: 3 }}>{cap(p.fit)}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 11 }}>
        <span style={{ marginTop: 1, flex: "none" }}>
          <Ring size={15} state="rest" />
        </span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontStyle: "italic", color: "var(--aura-violet)", lineHeight: 1.4 }}>{p.ora}</span>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid oklch(0.91 0.03 ${hue})` }}>
          <div style={{ marginBottom: 12 }}>
            <StatusTag status={RSVP[p.id]} />
          </div>
          <div className="aura-label" style={{ marginBottom: 8 }}>
            What you share
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {sharedOf(p).map((s) => (
              <span key={s} style={tintChip(hue)}>
                {s}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 14, color: "var(--aura-ink-70)", marginTop: 11, lineHeight: 1.5 }}>You&apos;d both show up for {showUpOf(p)}.</div>
        </div>
      )}
    </div>
  );
}

// Postcard header: cream header keeps the headline; a framed photo banner tucks
// under it with a pinned caption.
function AHeaderPostcard() {
  return (
    <div style={{ padding: "22px 20px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <Cal c="var(--aura-violet)" />
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--aura-violet)" }}>{PLAN.when}</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, lineHeight: 1.08, letterSpacing: "0.01em" }}>{PLAN.activity}</div>
      <div style={{ position: "relative", marginTop: 14, borderRadius: 16, overflow: "hidden", border: "1px solid var(--aura-ink-10)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/otto-ambience.png" alt="Otto Bar" style={{ display: "block", width: "100%", height: 140, objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "20px 14px 10px",
            background: "linear-gradient(to top, rgba(22,13,34,0.72), transparent)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Pin c="rgba(250,247,242,0.95)" />
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(250,247,242,0.96)" }}>
            {PLAN.venue} · {PLAN.hood}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        {PLAN.vibes.map((v) => (
          <Vibe key={v}>{v}</Vibe>
        ))}
      </div>
    </div>
  );
}

// Your confirmed entry — appears in the list once you've accepted.
function YouRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 13,
        padding: "14px 15px",
        marginBottom: 10,
        borderRadius: 18,
        background: "oklch(0.965 0.03 150)",
        border: "1px solid oklch(0.88 0.05 150)",
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--aura-violet)",
          color: "#FAF7F2",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 18,
        }}
      >
        I
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.5 0.12 300)" }}>You</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.42, color: "var(--aura-ink-90)", marginTop: 2 }}>You&apos;re in. Ora will introduce you to the group.</div>
        <div style={{ marginTop: 8 }}>
          <StatusTag status="confirmed" />
        </div>
      </div>
    </div>
  );
}

// Floating CTA pinned to the visible bottom; flips to a confirmed pill on accept.
function FloatingAccept({ accepted, onToggle }: { accepted: boolean; onToggle: () => void }) {
  return (
    <div style={{ position: "sticky", bottom: 0, zIndex: 30, marginTop: -8 }}>
      <div style={{ padding: "36px 20px 18px", background: "linear-gradient(to top, var(--aura-bg) 42%, rgba(250,247,242,0.72) 74%, rgba(250,247,242,0))" }}>
        {!accepted ? (
          <button onClick={onToggle} className="btn btn--aurora" style={{ width: "100%", whiteSpace: "nowrap" }}>
            I&apos;m in →
          </button>
        ) : (
          <button
            onClick={onToggle}
            style={{
              width: "100%",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              padding: "15px",
              borderRadius: 9999,
              background: "oklch(0.95 0.04 150)",
              color: "oklch(0.4 0.09 150)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 16,
              boxShadow: "0 12px 28px rgba(40,120,70,0.18)",
            }}
          >
            <StatusIcon status="confirmed" size={18} /> You&apos;re in
          </button>
        )}
      </div>
    </div>
  );
}

function ABody({ accepted }: { accepted: boolean }) {
  const baseConfirmed = PEOPLE.filter((p) => RSVP[p.id] === "confirmed").length;
  const confirmed = baseConfirmed + (accepted ? 1 : 0);
  const awaiting = PEOPLE.length - baseConfirmed;
  return (
    <div style={{ padding: "2px 20px 18px" }}>
      <div className="aura-divider" />
      <div className="aura-label" style={{ marginBottom: 8 }}>
        Why this Plan
      </div>
      <p className="aura-body" style={{ color: "var(--aura-ink-70)", margin: 0, fontSize: 15 }}>
        {PLAN.why}
      </p>
      <div className="aura-divider" />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <div className="aura-label">Who&apos;s coming</div>
        <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--aura-ink-45)" }}>
          {confirmed} confirmed · {awaiting} awaiting
        </span>
      </div>
      <p className="aura-body" style={{ fontSize: 14, color: "var(--aura-ink-55)", margin: "0 0 14px" }}>
        Six people Ora thinks you&apos;ll click with. Tap anyone to see why.
      </p>
      {accepted && <YouRow />}
      {PEOPLE.map((p) => (
        <PersonIntro key={p.id} p={p} />
      ))}
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
        <span className="chip chip--outline">Different activity</span>
        <span className="chip chip--outline">Different people</span>
        <span className="chip chip--outline">Different vibe</span>
      </div>
    </div>
  );
}

// The flow's Plan card: postcard header + shared body, with the floating accept.
export function MobilePlanA({ onAccept }: { onAccept?: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const handle = () => {
    if (onAccept) {
      setAccepted(true);
      setTimeout(onAccept, 460);
    } else setAccepted((v) => !v);
  };
  return (
    <>
      <MobileSurface>
        <h2 style={mHead}>Your first Plan.</h2>
        <div style={mCard}>
          <AHeaderPostcard />
          <ABody accepted={accepted} />
        </div>
      </MobileSurface>
      <FloatingAccept accepted={accepted} onToggle={handle} />
    </>
  );
}
