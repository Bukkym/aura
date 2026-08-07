"use client";

// Journey home, dual-track:
//   - crew mode: the user committed to the 5-plan journey. The ring is a journey
//     tracker (activity N of 5) with the crew accumulating inside. Honest program
//     progress, never a promise of a friend group at 5.
//   - single mode: one-off plans. The ring rests as a standing invitation to
//     start a crew; a single plan can still sit in "up next".
// Crew members can spin off a single plan between crew plans (onPlanSingle);
// single users can commit to a crew anytime (onStartCrew).

import { Swatch } from "../primitives";

export type CirclePerson = { id: string; name: string };
export type UpNext = { title: string; when: string; recurrence?: string; joined?: boolean };

const C = 327; // circumference for r=52

export function JourneyHome({
  name,
  mode,
  step = 0,
  total = 5,
  crew,
  upNext,
  onJoinNext,
  onStartCrew,
  onPlanSingle,
}: {
  name: string;
  mode: "crew" | "single";
  step?: number; // crew mode: activities completed (0..total)
  total?: number;
  crew: CirclePerson[];
  upNext?: UpNext;
  onJoinNext?: () => void;
  onStartCrew?: () => void;
  onPlanSingle?: () => void;
}) {
  const isCrew = mode === "crew";
  const done = isCrew && step >= total;
  const fill = isCrew ? Math.min(1, step / total) : 0;
  const faces = crew.slice(0, 4);

  const headline = done
    ? "Meet your crew."
    : isCrew
      ? "Your crew is taking shape."
      : upNext
        ? "Your plan is set."
        : "No plan right now.";
  const sub = done
    ? "These are your people now. Keep the plans going."
    : isCrew
      ? crew.length > 0
        ? `${crew.slice(0, 2).map((c) => c.name).join(" and ")} keep showing up.`
        : "Ora brings the people you click with back, plan by plan."
      : upNext
        ? "Like who you meet? Turn it into a crew, and Ora brings them back."
        : "Ready when you are. Ora will line up your next one.";

  return (
    <div style={{ height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column", padding: "44px 24px 12px", position: "relative" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.4, filter: "blur(64px)", pointerEvents: "none" }} />
      <p style={{ position: "relative", fontSize: 12.5, color: "var(--aura-ink-55)" }}>Good morning, {name}</p>

      {/* the ring */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", margin: "8px 0 2px" }}>
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <svg viewBox="0 0 120 120" style={{ width: 150, height: 150, transform: "rotate(-90deg)" }}>
            <circle cx={60} cy={60} r={52} fill="none" stroke={done ? "url(#homeAurora)" : "var(--aura-ink-10)"} strokeWidth={9} />
            {isCrew && !done && fill > 0 && (
              <circle cx={60} cy={60} r={52} fill="none" stroke="url(#homeAurora)" strokeWidth={9} strokeLinecap="round" strokeDasharray={`${Math.round(C * fill)} ${C}`} />
            )}
            <defs>
              <linearGradient id="homeAurora" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7752e6" />
                <stop offset="0.55" stopColor="#a24e86" />
                <stop offset="1" stopColor="#dc5b3c" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {faces.length > 0 ? (
              <>
                <div style={{ display: "flex", marginBottom: 3 }}>
                  {faces.map((p, i) => (
                    <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: 9999, border: "2px solid var(--aura-bg)", display: "inline-flex" }}>
                      <Swatch id={p.id} name={p.name} size={26} />
                    </span>
                  ))}
                </div>
                {!done && <span style={{ fontSize: 10, color: "var(--aura-ink-55)" }}>your crew</span>}
              </>
            ) : (
              <span style={{ fontSize: 11, color: "var(--aura-ink-45)" }}>{isCrew ? "starting" : "rest"}</span>
            )}
          </div>
        </div>
      </div>

      {/* step indicator (crew only) */}
      {isCrew && (
        <div style={{ position: "relative", textAlign: "center", marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 5 }}>
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: 9999, background: i < step ? "var(--aura-plum)" : "var(--aura-ink-10)" }} />
            ))}
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--aura-ink-55)", fontWeight: 600 }}>
            {done ? "Five plans in" : step === 0 ? "Your journey starts" : `Activity ${step} of ${total}`}
          </div>
        </div>
      )}

      <h1 style={{ position: "relative", fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 20, textAlign: "center", margin: "12px 0 0", letterSpacing: "-0.01em" }}>
        {headline}
      </h1>
      <p style={{ position: "relative", fontSize: 12.5, color: "var(--aura-ink-55)", textAlign: "center", margin: "4px 12px 0" }}>{sub}</p>

      <div style={{ position: "relative", flex: 1 }} />

      {/* up next plan */}
      {upNext && !done && (
        <div style={{ position: "relative", background: "#fffdf7", border: "1px solid var(--aura-ink-10)", borderRadius: 16, padding: 15, marginBottom: 10 }}>
          <p className="aura-label" style={{ marginBottom: 5 }}>Up next</p>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{upNext.title}</p>
          {upNext.recurrence ? (
            <p style={{ fontSize: 11.5, color: "var(--aura-plum)", fontWeight: 600, margin: "2px 0 11px" }}>{upNext.recurrence}</p>
          ) : (
            <p style={{ fontSize: 11.5, color: "var(--aura-ink-55)", margin: "2px 0 11px" }}>{upNext.when}</p>
          )}
          <button onClick={onJoinNext} className="btn-soft btn-soft--plum" style={{ padding: 11, fontSize: 13 }}>
            {upNext.joined ? "You're in" : "I'm in"}
          </button>
        </div>
      )}

      {/* mode-specific action */}
      {done ? (
        <button onClick={onStartCrew} className="btn-soft btn-soft--plum" style={{ position: "relative", marginBottom: 10 }}>Name your crew</button>
      ) : isCrew ? (
        onPlanSingle && (
          <button onClick={onPlanSingle} className="btn-soft btn-soft--ghost" style={{ position: "relative", marginBottom: 10 }}>Plan something on the side</button>
        )
      ) : upNext ? (
        <button onClick={onStartCrew} className="btn-soft btn-soft--ghost" style={{ position: "relative", marginBottom: 10 }}>Start a crew</button>
      ) : (
        <button onClick={onPlanSingle} className="btn-soft btn-soft--plum" style={{ position: "relative", marginBottom: 10 }}>Plan something</button>
      )}
    </div>
  );
}
