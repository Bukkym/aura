"use client";

// Post-plan feedback — "who did you click with?" The arc hook and the data
// engine: the people you pick get re-seated into your next plan. Matches the
// Warm Aurora mockup. Directional (per-person), lightweight.

import { useState } from "react";
import { Swatch } from "../primitives";

export type FeedbackPerson = { id: string; name: string };

export function FeedbackView({
  planLabel,
  people,
  onSave,
}: {
  planLabel: string;
  people: FeedbackPerson[];
  onSave?: (picks: Record<string, boolean>) => void;
}) {
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [comeBack, setComeBack] = useState(true);
  const toggle = (id: string) => setPicks((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column", padding: "46px 24px 24px" }}>
      <p className="aura-label" style={{ marginBottom: 6 }}>{planLabel}</p>
      <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 24, letterSpacing: "-0.01em", margin: "0 0 6px" }}>
        Who did you click with?
      </h1>
      <p style={{ fontSize: 12.5, color: "var(--aura-ink-55)", margin: "0 0 18px" }}>
        Ora brings the people you pick into your next plan.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {people.map((p) => {
          const on = picks[p.id];
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "11px 12px",
                border: "1px solid var(--aura-ink-10)",
                borderRadius: 14,
                background: on ? "#fffdf7" : "none",
              }}
            >
              <Swatch id={p.id} name={p.name} size={34} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              <button
                onClick={() => toggle(p.id)}
                style={{
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "7px 13px",
                  borderRadius: 999,
                  border: on ? "none" : "1.5px solid var(--aura-ink-10)",
                  background: on ? "var(--aura-plum)" : "none",
                  color: on ? "#fff" : "var(--aura-ink-55)",
                  transition: "background 160ms, color 160ms",
                }}
              >
                {on ? "See again" : "Maybe"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ background: "var(--aura-violet-12)", borderRadius: 16, padding: "13px 15px", margin: "14px 0" }}>
        <p style={{ fontSize: 12.5, color: "var(--aura-ink-90)", margin: "0 0 9px" }}>Would you come back?</p>
        <div style={{ display: "flex", gap: 8 }}>
          {(["Yes", "Not really"] as const).map((opt) => {
            const on = (opt === "Yes") === comeBack;
            return (
              <button
                key={opt}
                onClick={() => setComeBack(opt === "Yes")}
                style={{
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "7px 15px",
                  borderRadius: 999,
                  border: "none",
                  background: on ? "var(--aura-plum)" : "rgba(126,92,144,0.12)",
                  color: on ? "#fff" : "var(--aura-ink-55)",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={() => onSave?.(picks)} className="btn-soft btn-soft--ink">Save</button>
    </div>
  );
}
