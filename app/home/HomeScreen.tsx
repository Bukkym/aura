"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { useLivePlan } from "@/components/aura/useLivePlan";
import { JourneyHome } from "@/components/aura/screens/journey-home";
import { BottomBar } from "@/components/aura/screens/bottom-bar";
import { FindingMoment, FormingMoment, NoDraftState, ErrorState } from "@/components/aura/screens/states";
import { SignOutButton } from "@/components/SignOutButton";

// Home is the dual-track journey. /api/journey says whether the user committed
// to a crew (crew mode → activity N of 5) or is doing single plans (ring rests,
// "Start a crew" opts in). Progress + crew come from their confirmed plans.

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

interface Journey {
  onCrewJourney: boolean;
  step: number;
  crew: { id: string; name: string }[];
}

export function HomeScreen() {
  const router = useRouter();
  const { phase } = useLivePlan(true);
  const [journey, setJourney] = useState<Journey | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/journey")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && !d.error) setJourney(d as Journey);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const startCrew = async () => {
    try {
      await fetch("/api/crew/start", { method: "POST" });
    } catch {
      // ignore; optimistic flip below
    }
    setJourney((j) => ({ onCrewJourney: true, step: j?.step ?? 0, crew: j?.crew ?? [] }));
  };

  if (phase.kind === "loading") return <Shell inner={<FindingMoment />} />;
  if (phase.kind === "forming") return <Shell inner={<FormingMoment />} />;
  if (phase.kind === "no-draft") return <Shell inner={<NoDraftState />} />;
  if (phase.kind === "error") return <Shell inner={<ErrorState message={phase.message} />} />;

  const plan = phase.kind === "ready" ? phase.plan : null;
  const name = (plan?.createdForDisplayName || "there").split(" ")[0];
  const mode: "crew" | "single" = journey?.onCrewJourney ? "crew" : "single";
  const crew =
    journey?.crew && journey.crew.length > 0
      ? journey.crew
      : plan
        ? plan.attendees.slice(0, 3).map((a) => ({ id: a.userId, name: a.displayName }))
        : [];

  const home = (
    <JourneyHome
      name={name}
      mode={mode}
      step={journey?.step ?? 0}
      crew={crew}
      upNext={plan ? { title: cap(plan.activityType), when: formatWhen(plan.dateTime) } : undefined}
      onJoinNext={() => router.push("/plan")}
      onStartCrew={startCrew}
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
