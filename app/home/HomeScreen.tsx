"use client";

import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { useLivePlan } from "@/components/aura/useLivePlan";
import { LiveHome } from "@/components/aura/screens/live-shell";
import { FindingMoment, NoDraftState, ErrorState } from "@/components/aura/screens/states";
import { SignOutButton } from "@/components/SignOutButton";
import { TodayBadge } from "@/components/TodayBadge";

// Home owns the "finding" beat: it generates the Plan (once) and caches it, so
// /plan and /plans read the warm cache. Status (ready/confirmed) reflects an
// accept made on /plan.
export function HomeScreen() {
  const router = useRouter();
  const { phase, status } = useLivePlan(true);

  let inner: React.ReactNode;
  if (phase.kind === "loading") inner = <FindingMoment />;
  else if (phase.kind === "no-draft") inner = <NoDraftState />;
  else if (phase.kind === "error") inner = <ErrorState message={phase.message} />;
  else inner = <LiveHome plan={phase.plan} status={status} onOpenPlan={() => router.push("/plan")} onPlans={() => router.push("/plans")} />;

  return (
    <PhoneFrame
      screenKey={phase.kind}
      overlay={
        <div style={{ position: "absolute", top: 14, right: 16, zIndex: 50 }}>
          <SignOutButton />
        </div>
      }
      footer={<TodayBadge />}
    >
      {inner}
    </PhoneFrame>
  );
}
