"use client";

import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { useLivePlan, confirmLivePlan, declineLivePlan } from "@/components/aura/useLivePlan";
import { LivePlanCard } from "@/components/aura/screens/live-plan";
import { FindingMoment, FormingMoment, NoDraftState, EmptyPlanState, ErrorState } from "@/components/aura/screens/states";
import { SignOutButton } from "@/components/SignOutButton";

// The Plan detail screen. Reached from Home (warm cache → instant card); if
// deep-linked, useLivePlan regenerates from the draft (brief finding beat).
// Accepting marks the plan confirmed (reflected on Home) and shows the
// Ora-voiced WhatsApp handoff.
export function PlanScreen() {
  const router = useRouter();
  const { phase, status } = useLivePlan(true);

  let inner: React.ReactNode;
  if (phase.kind === "loading") inner = <FindingMoment />;
  else if (phase.kind === "forming") inner = <FormingMoment />;
  else if (phase.kind === "no-draft") inner = <NoDraftState />;
  else if (phase.kind === "empty") inner = <EmptyPlanState onSeePlans={() => router.push("/plans")} />;
  else if (phase.kind === "error") inner = <ErrorState message={phase.message} />;
  else
    inner = (
      <LivePlanCard
        plan={phase.plan}
        status={status}
        onBack={() => router.push("/home")}
        onAccepted={() => confirmLivePlan(phase.plan.planId)}
        onDone={() => router.push("/home")}
        onCancel={async () => {
          await declineLivePlan(phase.plan.planId);
          router.push("/home");
        }}
      />
    );

  return (
    <PhoneFrame
      screenKey={phase.kind}
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
