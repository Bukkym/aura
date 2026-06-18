"use client";

import { useEffect, useState } from "react";
import type { LookingForExtracted, SelfExtracted, PlanStatus } from "@/types";
import type { PlanResponse } from "@/app/api/plan/create/route";

export type { PlanStatus };

// Shared client state for the live app shell (/home, /plan, /plans).
//
// The deterministic engine returns a stable Plan per user, so we generate it
// once (POST /api/plan/create using the aura:draft profile written by
// onboarding) and cache the PlanResponse in sessionStorage. Every shell screen
// reads that cache instead of re-generating, so navigation is instant and the
// same Plan shows everywhere. planStatus ("ready" | "confirmed") is also kept
// in sessionStorage so accepting on /plan reflects back on /home.

const DRAFT_KEY = "aura:draft";
const PLAN_KEY = "aura:plan";
const STATUS_KEY = "aura:planStatus";

export type PlanPhase =
  | { kind: "loading" }
  | { kind: "no-draft" }
  | { kind: "error"; message: string }
  | { kind: "ready"; plan: PlanResponse };

interface Draft {
  selfExtracted: SelfExtracted;
  lookingForExtracted: LookingForExtracted;
}

function readCachedPlan(): PlanResponse | null {
  try {
    const raw = sessionStorage.getItem(PLAN_KEY);
    return raw ? (JSON.parse(raw) as PlanResponse) : null;
  } catch {
    return null;
  }
}

export function getPlanStatus(): PlanStatus {
  try {
    return sessionStorage.getItem(STATUS_KEY) === "confirmed" ? "confirmed" : "ready";
  } catch {
    return "ready";
  }
}

export function setPlanStatus(status: PlanStatus): void {
  try {
    sessionStorage.setItem(STATUS_KEY, status);
  } catch {
    // ignore
  }
}

// Accept a plan: flip the local status immediately (instant UI) and persist the
// confirmation to the DB so it survives refresh and shows in the Plans history.
// The DB write is best-effort: a failure leaves the optimistic local status in
// place rather than blocking the handoff.
export async function confirmLivePlan(planId: string): Promise<void> {
  setPlanStatus("confirmed");
  try {
    await fetch("/api/plan/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId }),
    });
  } catch {
    // ignore; local status already reflects the acceptance
  }
}

// Clears the cached plan + status (used by /demo-reset). The draft is cleared
// by the reset route's own logic.
export function clearLivePlan(): void {
  try {
    sessionStorage.removeItem(PLAN_KEY);
    sessionStorage.removeItem(STATUS_KEY);
  } catch {
    // ignore
  }
}

// `generate` controls whether a cache miss triggers a fetch. /home passes true
// (it owns the "finding" beat); /plan and /plans pass true too as a fallback so
// a deep link still works, but normally they hit the warm cache.
export function useLivePlan(generate: boolean = true): { phase: PlanPhase; status: PlanStatus } {
  const [phase, setPhase] = useState<PlanPhase>(() => {
    return { kind: "loading" };
  });
  const [status, setStatus] = useState<PlanStatus>("ready");

  useEffect(() => {
    let cancelled = false;

    const cached = readCachedPlan();
    if (cached) {
      setStatus(getPlanStatus());
      setPhase({ kind: "ready", plan: cached });
      return;
    }

    if (!generate) {
      setPhase({ kind: "no-draft" });
      return;
    }

    let draft: Draft | null = null;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) draft = JSON.parse(raw) as Draft;
    } catch {
      // ignore
    }
    if (!draft) {
      setPhase({ kind: "no-draft" });
      return;
    }

    (async () => {
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
        if (cancelled) return;
        try {
          sessionStorage.setItem(PLAN_KEY, JSON.stringify(plan));
          if (!sessionStorage.getItem(STATUS_KEY)) sessionStorage.setItem(STATUS_KEY, "ready");
        } catch {
          // ignore cache write failure
        }
        setStatus(getPlanStatus());
        setPhase({ kind: "ready", plan });
      } catch (err) {
        if (!cancelled) {
          setPhase({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [generate]);

  return { phase, status };
}
