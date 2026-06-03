"use client";

import { CSSProperties } from "react";
import { Ring } from "../primitives";

// Shared minimal bottom bar: Home · Ora(ask) · Plans. The center Ora ring opens
// the Ask Ora sheet.
export function BottomBar({
  active = "home",
  onHome,
  onAsk,
  onPlans,
}: {
  active?: "home" | "plans";
  onHome: () => void;
  onAsk: () => void;
  onPlans: () => void;
}) {
  const lbl = (on: boolean): CSSProperties => ({
    fontFamily: "var(--font-body)",
    fontSize: 12.5,
    cursor: "pointer",
    fontWeight: on ? 600 : 400,
    color: on ? "var(--aura-ink)" : "var(--aura-ink-45)",
    background: "none",
    border: "none",
    padding: "6px 4px",
  });
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "10px 30px 22px",
        borderTop: "1px solid var(--aura-ink-06)",
        background: "var(--aura-bg)",
      }}
    >
      <button onClick={onHome} style={lbl(active === "home")}>
        Home
      </button>
      <button onClick={onAsk} aria-label="Ask Ora" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, transform: "translateY(-6px)" }}>
        <Ring size={48} state="idle" />
      </button>
      <button onClick={onPlans} style={lbl(active === "plans")}>
        Plans
      </button>
    </div>
  );
}
