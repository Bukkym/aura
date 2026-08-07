"use client";

import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { useLivePlan } from "@/components/aura/useLivePlan";
import { JourneyHome } from "@/components/aura/screens/journey-home";
import { BottomBar } from "@/components/aura/screens/bottom-bar";
import { FindingMoment, FormingMoment, NoDraftState, ErrorState } from "@/components/aura/screens/states";
import { SignOutButton } from "@/components/SignOutButton";

// Home is the journey. Dual-track: everyone starts in "single" mode (one-off
// plans) with the ring resting as a standing invite to start a crew; committing
// to the 5-plan journey (at checkout) flips them to "crew" mode with the
// activity-N-of-5 tracker. Crew mode + progress needs a backend flag + a
// completed-plan count, deferred; until then Home renders single mode.

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Toronto" });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" })
    .replace(" ", "")
    .toLowerCase();
  return `${day} · ${time}`;
}

export function HomeScreen() {
  const router = useRouter();
  const { phase } = useLivePlan(true);

  // Transitional / non-journey phases render full-screen, no bar.
  if (phase.kind === "loading") return <Shell inner={<FindingMoment />} />;
  if (phase.kind === "forming") return <Shell inner={<FormingMoment />} />;
  if (phase.kind === "no-draft") return <Shell inner={<NoDraftState />} />;
  if (phase.kind === "error") return <Shell inner={<ErrorState message={phase.message} />} />;

  const plan = phase.kind === "ready" ? phase.plan : null;
  const name = (plan?.createdForDisplayName || "there").split(" ")[0];

  const home = (
    <JourneyHome
      name={name}
      mode="single"
      crew={plan ? plan.attendees.slice(0, 3).map((a) => ({ id: a.userId, name: a.displayName })) : []}
      upNext={plan ? { title: cap(plan.activityType), when: formatWhen(plan.dateTime) } : undefined}
      onJoinNext={() => router.push("/plan")}
      onStartCrew={() => router.push("/plan")}
      onPlanSingle={() => router.push("/plan")}
    />
  );

  return (
    <Shell
      inner={
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ flex: 1, minHeight: 0 }}>{home}</div>
          <BottomBar active="home" onHome={() => router.push("/home")} onAsk={() => router.push("/plan")} onPlans={() => router.push("/plans")} />
        </div>
      }
    />
  );
}

function Shell({ inner }: { inner: React.ReactNode }) {
  return (
    <PhoneFrame
      screenKey="home"
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
