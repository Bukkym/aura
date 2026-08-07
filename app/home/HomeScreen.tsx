"use client";

import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { useLivePlan } from "@/components/aura/useLivePlan";
import { JourneyHome } from "@/components/aura/screens/journey-home";
import { FindingMoment, FormingMoment, NoDraftState, EmptyPlanState, ErrorState } from "@/components/aura/screens/states";
import { SignOutButton } from "@/components/SignOutButton";

// Home is the journey: the "finding" beat generates the plan (once, cached),
// then Home shows the crew forming + the up-next plan. Tapping the plan opens
// the full plan card (/plan → checkout → confirmed).

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Europe/Berlin" });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Europe/Berlin" })
    .replace(" ", "")
    .toLowerCase();
  return `${day} · ${time}`;
}

export function HomeScreen() {
  const router = useRouter();
  const { phase, status } = useLivePlan(true);

  let inner: React.ReactNode;
  if (phase.kind === "loading") inner = <FindingMoment />;
  else if (phase.kind === "forming") inner = <FormingMoment />;
  else if (phase.kind === "no-draft") inner = <NoDraftState />;
  else if (phase.kind === "empty") inner = <EmptyPlanState onSeePlans={() => router.push("/plans")} />;
  else if (phase.kind === "error") inner = <ErrorState message={phase.message} />;
  else {
    const plan = phase.plan;
    const first = (plan.createdForDisplayName || "there").split(" ")[0];
    inner = (
      <JourneyHome
        name={first}
        circle={plan.attendees.slice(0, 3).map((a) => ({ id: a.userId, name: a.displayName }))}
        upNext={{
          title: cap(plan.activityType),
          when: formatWhen(plan.dateTime),
          joined: status === "confirmed",
        }}
        onJoinNext={() => router.push("/plan")}
      />
    );
  }

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
