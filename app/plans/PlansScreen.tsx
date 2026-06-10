"use client";

import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { useLivePlan } from "@/components/aura/useLivePlan";
import { LivePlansTab } from "@/components/aura/screens/live-shell";
import { FindingMoment, NoDraftState, ErrorState } from "@/components/aura/screens/states";
import { SignOutButton } from "@/components/SignOutButton";

export function PlansScreen() {
  const router = useRouter();
  // Normally reached from Home with a warm cache; generate as a fallback for a
  // deep link.
  const { phase, status } = useLivePlan(true);

  let inner: React.ReactNode;
  if (phase.kind === "loading") inner = <FindingMoment />;
  else if (phase.kind === "no-draft") inner = <NoDraftState />;
  else if (phase.kind === "error") inner = <ErrorState message={phase.message} />;
  else inner = <LivePlansTab plan={phase.plan} status={status} onHome={() => router.push("/home")} onOpenPlan={() => router.push("/plan")} />;

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
