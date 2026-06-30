"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { useLivePlan } from "@/components/aura/useLivePlan";
import { LivePlansTab, type LiveStretch } from "@/components/aura/screens/live-shell";
import { FindingMoment, NoDraftState, ErrorState } from "@/components/aura/screens/states";
import { SignOutButton } from "@/components/SignOutButton";
import type { PlanSummary } from "@/types";

interface History {
  upcoming: PlanSummary[];
  past: PlanSummary[];
}

export function PlansScreen() {
  const router = useRouter();
  // useLivePlan generates + persists the current plan if arriving with a draft
  // and no warm cache (and gives us the finding beat). The Plans tab itself is
  // DB-backed: we read the persisted history once generation has settled.
  const { phase } = useLivePlan(true);
  const planId = phase.kind === "ready" ? phase.plan.planId : null;

  const [history, setHistory] = useState<History | null>(null);
  const [stretch, setStretch] = useState<LiveStretch | null>(null);

  useEffect(() => {
    // Wait until generation settles so a just-created plan is in the history.
    if (phase.kind === "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plans");
        const data = (await res.json()) as Partial<History>;
        const upcoming = data.upcoming ?? [];
        const past = data.past ?? [];
        if (cancelled) return;
        setHistory({ upcoming, past });

        // Once the user has a plan, ask Ora for a stretch offer (M4.5). Returns
        // { stretch: null } when the user's stated preferences don't warrant one.
        if (upcoming.length + past.length > 0) {
          const sres = await fetch("/api/plan/stretch", { method: "POST" });
          if (!cancelled && sres.ok) {
            const sdata = (await sres.json()) as {
              plan?: LiveStretch["plan"] | null;
              stretch?: { usualLabel: string; thisLabel: string } | null;
            };
            if (!cancelled && sdata.plan && sdata.stretch) {
              setStretch({ plan: sdata.plan, usualLabel: sdata.stretch.usualLabel, thisLabel: sdata.stretch.thisLabel });
            }
          }
        }
      } catch {
        if (!cancelled) setHistory({ upcoming: [], past: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase.kind, planId]);

  let inner: React.ReactNode;
  if (phase.kind === "loading") inner = <FindingMoment />;
  else if (phase.kind === "error") inner = <ErrorState message={phase.message} />;
  else if (history === null) inner = <FindingMoment />;
  else if (history.upcoming.length === 0 && history.past.length === 0 && phase.kind === "no-draft")
    inner = <NoDraftState />;
  else
    inner = (
      <LivePlansTab
        // The stretch plan is persisted too, so keep it out of the normal list;
        // it shows in its own teaser instead.
        upcoming={history.upcoming.filter((s) => s.id !== stretch?.plan.planId)}
        past={history.past.filter((s) => s.id !== stretch?.plan.planId)}
        onHome={() => router.push("/home")}
        onOpenPlan={() => router.push("/plan")}
        currentAttendees={history.upcoming[0]?.attendees ?? []}
        onRefined={() => router.push("/plan")}
        stretch={stretch}
      />
    );

  return (
    <PhoneFrame
      screenKey={phase.kind === "ready" ? (history === null ? "loading" : "ready") : phase.kind}
      overlay={
        <div style={{ position: "absolute", top: 14, right: 16, zIndex: 50 }}>
          <SignOutButton />
        </div>
      }
    >
      {inner}
    </PhoneFrame>
  );
}
