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
  | { kind: "forming" }
  | { kind: "no-draft" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready"; plan: PlanResponse };

// A freshly built Plan is held on the "forming" beat for at least this long, so
// it never appears instantly (instant reads as canned, not curated). The
// deterministic engine usually returns well under this, so the beat is mostly
// deliberate pacing rather than real waiting. A warm cache skips it entirely.
// When matching depends on other people accepting, this becomes a real async
// wait with a nudge when the group is set.
const FORMING_MIN_MS = 6000;

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

// Screens that render the current plan listen for this event, so an update
// made elsewhere (the Ask Ora sheet running a plan tool) reflects immediately
// without a reload.
const PLAN_EVENT = "aura:plan-changed";

function announcePlanChange(): void {
  try {
    window.dispatchEvent(new Event(PLAN_EVENT));
  } catch {
    // ignore (SSR or restricted context)
  }
}

// Clears the cached plan + status (used by /demo-reset and when Ora withdraws
// the current plan). The draft is cleared by the reset route's own logic.
export function clearLivePlan(): void {
  try {
    sessionStorage.removeItem(PLAN_KEY);
    sessionStorage.removeItem(STATUS_KEY);
  } catch {
    // ignore
  }
  announcePlanChange();
}

// Make a plan the cached "current" one, so Home/plan read it instantly. Used
// after a refine and when loading the current plan from the DB. Deliberately
// silent (no event): useLivePlan's own resolution caches mid-flight, including
// during the forming beat, and an event there would reveal the plan early.
function cachePlan(plan: PlanResponse, status: PlanStatus): void {
  try {
    sessionStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    sessionStorage.setItem(STATUS_KEY, status);
  } catch {
    // ignore
  }
}

/**
 * Set the current plan from outside the hook (the Ask Ora sheet after a plan
 * tool ran) and notify every mounted screen.
 */
export function cacheLivePlan(plan: PlanResponse, status: PlanStatus): void {
  cachePlan(plan, status);
  announcePlanChange();
}

export interface PlanRefinement {
  activityType?: string;
  excludeUserIds?: string[];
}

// Request another Plan: same profile, a refined activity and/or a different
// group. On success the new plan becomes the cached current one (ready), so
// navigating to /plan shows it. Returns the new plan.
export async function requestAnotherPlan(refinement: PlanRefinement): Promise<PlanResponse> {
  const res = await fetch("/api/plan/refine", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refinement }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.error ?? `Request failed: ${res.status}`);
  }
  const { plan } = (await res.json()) as { plan: PlanResponse };
  cachePlan(plan, "ready");
  return plan;
}

// Decline ("Not now") a plan: persist it and drop the cached current plan, so
// Home/plan re-resolve from the DB (the next active plan, or the empty state)
// rather than showing the dismissed one.
export async function declineLivePlan(planId: string): Promise<void> {
  try {
    await fetch("/api/plan/decline", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId }),
    });
  } catch {
    // ignore; the cache is cleared regardless so the plan stops showing
  }
  clearLivePlan();
}

// `generate` controls whether the first-plan fall-through builds a plan from the
// onboarding draft. All shell screens pass true. The resolution order is: warm
// cache → the current plan from the DB → (only for a brand-new user) generate a
// first plan with the forming beat → empty / no-draft.
export function useLivePlan(generate: boolean = true): { phase: PlanPhase; status: PlanStatus } {
  const [phase, setPhase] = useState<PlanPhase>(() => {
    return { kind: "loading" };
  });
  const [status, setStatus] = useState<PlanStatus>("ready");

  // React to plan changes made by other surfaces (the Ask Ora sheet): re-read
  // the cache and show the new plan, or the empty state after a withdrawal.
  useEffect(() => {
    function onPlanChanged() {
      const plan = readCachedPlan();
      if (plan) {
        setStatus(getPlanStatus());
        setPhase({ kind: "ready", plan });
      } else {
        setPhase({ kind: "empty" });
      }
    }
    window.addEventListener(PLAN_EVENT, onPlanChanged);
    return () => window.removeEventListener(PLAN_EVENT, onPlanChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;

    const cached = readCachedPlan();
    if (cached) {
      // Warm cache: the Plan was already resolved earlier this session, so
      // reveal it immediately.
      setStatus(getPlanStatus());
      setPhase({ kind: "ready", plan: cached });
      return;
    }

    function readDraft(): Draft | null {
      try {
        // The draft lives in localStorage so it survives the magic-link bounce
        // opening a new tab. The sessionStorage read is a fallback for drafts
        // written before that change.
        const raw =
          localStorage.getItem(DRAFT_KEY) ?? sessionStorage.getItem(DRAFT_KEY);
        return raw ? (JSON.parse(raw) as Draft) : null;
      } catch {
        return null;
      }
    }

    // Once the first plan exists in the DB the draft has served its purpose.
    // Clearing it keeps a later signed-out user on this browser from generating
    // a first plan off someone else's answers.
    function clearDraft(): void {
      try {
        localStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
    }

    // Build the user's first plan from the onboarding draft, behind the
    // deliberate forming beat (held at least FORMING_MIN_MS so it reads as
    // curated, not instant). Only used when the DB shows no plan at all.
    function generateFirstPlan(draft: Draft) {
      const startedAt = Date.now();
      setPhase({ kind: "forming" });
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
          cachePlan(plan, "ready");
          clearDraft();
          const remaining = Math.max(0, FORMING_MIN_MS - (Date.now() - startedAt));
          revealTimer = setTimeout(() => {
            if (cancelled) return;
            setStatus("ready");
            setPhase({ kind: "ready", plan });
          }, remaining);
        } catch (err) {
          if (!cancelled) {
            setPhase({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong" });
          }
        }
      })();
    }

    setPhase({ kind: "loading" });
    (async () => {
      // DB-backed: prefer the user's current plan, so a declined or
      // already-built plan is never regenerated from the profile.
      try {
        const res = await fetch("/api/plan/current");
        if (res.ok) {
          const data = (await res.json()) as {
            plan: PlanResponse | null;
            status: PlanStatus | null;
            hasAnyPlans: boolean;
          };
          if (cancelled) return;
          if (data.plan) {
            const s = data.status ?? "ready";
            cachePlan(data.plan, s);
            setStatus(s);
            setPhase({ kind: "ready", plan: data.plan });
            return;
          }
          // No active plan: a brand-new user (no plans at all) gets a first plan
          // generated; anyone who declined or used theirs sees the empty
          // "request another" state, not a regenerated duplicate.
          if (!data.hasAnyPlans && generate) {
            const draft = readDraft();
            if (draft) {
              generateFirstPlan(draft);
              return;
            }
            setPhase({ kind: "no-draft" });
            return;
          }
          setPhase({ kind: "empty" });
          return;
        }
      } catch {
        // fall through to the draft path as a best-effort fallback
      }

      // /api/plan/current unavailable: fall back to draft-based generation.
      if (cancelled) return;
      if (!generate) {
        setPhase({ kind: "no-draft" });
        return;
      }
      const draft = readDraft();
      if (draft) {
        generateFirstPlan(draft);
        return;
      }
      setPhase({ kind: "no-draft" });
    })();

    return () => {
      cancelled = true;
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [generate]);

  return { phase, status };
}
