"use client";

// "Request another Plan" sheet. The profile stays fixed; this refines the plan
// itself. Two paths: a different activity (chips, reusing the onboarding
// activity vocab) or a different group (exclude the current attendees). Calls
// /api/plan/refine via requestAnotherPlan and hands the new plan back to the
// caller to navigate to. Voice will feed the same refinement payload later.

import { useEffect, useState } from "react";
import { Ring } from "../primitives";
import { requestAnotherPlan } from "../useLivePlan";
import type { PlanResponse } from "@/app/api/plan/create/route";

// Subset of the onboarding activity vocab (VOCAB.activities), the things a user
// can ask to do instead.
const ACTIVITY_OPTIONS = [
  "dinner parties",
  "gallery openings",
  "boulder gym",
  "lake days",
  "indie cinema",
  "museum afternoons",
  "techno clubs",
  "book clubs",
  "brunches",
  "hiking",
];

export function RequestAnotherSheet({
  open,
  onClose,
  attendees,
  onRefined,
}: {
  open: boolean;
  onClose: () => void;
  attendees: { userId: string; displayName: string }[];
  onRefined: (plan: PlanResponse) => void;
}) {
  const [mode, setMode] = useState<"choose" | "activity">("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("choose");
      setBusy(false);
      setError(null);
    }
  }, [open]);

  async function submit(refinement: { activityType?: string; excludeUserIds?: string[] }) {
    setBusy(true);
    setError(null);
    try {
      const plan = await requestAnotherPlan(refinement);
      onRefined(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: open ? "auto" : "none" }}>
      <div
        onClick={busy ? undefined : onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(14,11,34,0.42)", backdropFilter: "blur(2px)", opacity: open ? 1 : 0, transition: "opacity 280ms" }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--aura-bg)",
          borderRadius: "26px 26px 0 0",
          padding: "10px 22px 26px",
          boxShadow: "0 -18px 50px rgba(26,21,48,0.22)",
          transform: open ? "translateY(0)" : "translateY(102%)",
          transition: "transform 360ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 4, background: "var(--aura-ink-10)", margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <Ring size={34} state={busy ? "processing" : "rest"} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>Another Plan</div>
            <div style={{ fontSize: 12.5, color: "var(--aura-ink-45)" }}>Same you, something different.</div>
          </div>
        </div>

        {busy ? (
          <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "6px 2px 18px" }}>
            <Ring size={20} state="processing" />
            <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--aura-ink-90)" }}>
              Bringing another group together…
            </p>
          </div>
        ) : mode === "choose" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 6 }}>
            <button onClick={() => setMode("activity")} className="btn" style={{ width: "100%", justifyContent: "space-between", background: "transparent", color: "var(--aura-ink)", border: "1px solid var(--aura-violet-30)", padding: "0 18px" }}>
              Something different to do <span style={{ color: "var(--aura-violet)" }}>→</span>
            </button>
            <button
              onClick={() => submit({ excludeUserIds: attendees.map((a) => a.userId) })}
              disabled={attendees.length === 0}
              className="btn"
              style={{ width: "100%", justifyContent: "space-between", background: "transparent", color: "var(--aura-ink)", border: "1px solid var(--aura-violet-30)", padding: "0 18px", opacity: attendees.length === 0 ? 0.5 : 1 }}
            >
              Different people <span style={{ color: "var(--aura-violet)" }}>→</span>
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 12 }}>
              {ACTIVITY_OPTIONS.map((a) => (
                <button key={a} onClick={() => submit({ activityType: a })} className="chip chip--outline" style={{ cursor: "pointer", marginBottom: 0 }}>
                  {a}
                </button>
              ))}
            </div>
            <button onClick={() => setMode("choose")} className="btn btn--ghost" style={{ color: "var(--aura-ink-55)", fontSize: 13.5 }}>
              ← back
            </button>
          </div>
        )}

        {error && (
          <p style={{ margin: "12px 2px 0", fontSize: 13.5, color: "var(--aura-violet)" }} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
