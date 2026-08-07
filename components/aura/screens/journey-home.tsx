"use client";

// Journey home — the filling aurora ring as an honest, open-ended progress
// object ("your circle is forming"), never a countdown to a guaranteed crew.
// Matches the Warm Aurora mockup. The ring fills with how many faces keep
// recurring; the "up next" card holds the next plan.

import { Swatch } from "../primitives";

export type CirclePerson = { id: string; name: string };
export type UpNext = { title: string; when: string; joined?: boolean };

export function JourneyHome({
  name,
  circle,
  upNext,
  onJoinNext,
}: {
  name: string;
  circle: CirclePerson[];
  upNext: UpNext;
  onJoinNext?: () => void;
}) {
  // The ring fills with recurrence, capped so it always reads as "growing",
  // never "complete". Circumference for r=52 is ~327.
  const C = 327;
  const fill = Math.min(0.62, 0.18 + circle.length * 0.14);

  return (
    <div style={{ height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column", padding: "46px 24px 24px", position: "relative" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.45, filter: "blur(64px)", pointerEvents: "none" }} />
      <p style={{ position: "relative", fontSize: 12.5, color: "var(--aura-ink-55)" }}>Good morning, {name}</p>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", margin: "10px 0 4px" }}>
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <svg viewBox="0 0 120 120" style={{ width: 150, height: 150, transform: "rotate(-90deg)" }}>
            <circle cx={60} cy={60} r={52} fill="none" stroke="var(--aura-ink-10)" strokeWidth={9} />
            <circle
              cx={60}
              cy={60}
              r={52}
              fill="none"
              stroke="url(#journeyAurora)"
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={`${Math.round(C * fill)} ${C}`}
            />
            <defs>
              <linearGradient id="journeyAurora" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7752e6" />
                <stop offset="0.55" stopColor="#a24e86" />
                <stop offset="1" stopColor="#dc5b3c" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", marginBottom: 4 }}>
              {circle.slice(0, 3).map((p, i) => (
                <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: 9999, border: "2px solid var(--aura-bg)", display: "inline-flex" }}>
                  <Swatch id={p.id} name={p.name} size={26} />
                </span>
              ))}
            </div>
            <span style={{ fontSize: 10, color: "var(--aura-ink-55)" }}>taking shape</span>
          </div>
        </div>
      </div>

      <h1 style={{ position: "relative", fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 19, textAlign: "center", margin: 0, letterSpacing: "-0.01em" }}>
        Your crew is forming.
      </h1>
      <p style={{ position: "relative", fontSize: 12.5, color: "var(--aura-ink-55)", textAlign: "center", margin: "4px 0 0" }}>
        {circle.length} faces keep showing up. Ora keeps bringing them back.
      </p>

      <div style={{ position: "relative", flex: 1 }} />

      <div style={{ position: "relative", background: "#fffdf7", border: "1px solid var(--aura-ink-10)", borderRadius: 16, padding: 15 }}>
        <p className="aura-label" style={{ marginBottom: 5 }}>Up next</p>
        <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{upNext.title}</p>
        <p style={{ fontSize: 11.5, color: "var(--aura-ink-55)", margin: "2px 0 11px" }}>{upNext.when}</p>
        <button onClick={onJoinNext} className="btn-soft btn-soft--plum" style={{ padding: 11, fontSize: 13 }}>
          {upNext.joined ? "You're in" : "I'm in"}
        </button>
      </div>
    </div>
  );
}
