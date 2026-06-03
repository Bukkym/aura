"use client";

// aura — full-flow orchestrator. A 1:1 port of the prototype's screen-state
// router (design_handoff_aura/prototype/aura-flow.html): one `screen` string +
// go(), with planStatus + stretchStatus shared across the in-app shell. The
// device bezel and in-browser Babel from the prototype do not ship.

import { useRef, useState } from "react";
import { ScWelcome, ScEntry, ScVoice, ScFollowup, ScChips } from "./screens/onboarding";
import { ScAssembling, Home } from "./screens/app-shell";
import { MobilePlanA } from "./screens/plan-card";
import { MobilePlanReady } from "./screens/plan-ready";
import { PlansTab, StretchPlan } from "./screens/plans-tab";

type Screen = "welcome" | "entry" | "voice" | "followup" | "chips" | "assembling" | "home" | "plan" | "accepted" | "plans" | "stretch";

export function AuraFlow() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [planStatus, setPlanStatus] = useState<"forming" | "ready" | "confirmed">("forming");
  const [stretchStatus, setStretchStatus] = useState<"new" | "confirmed">("new");
  const scroller = useRef<HTMLDivElement>(null);
  const go = (s: Screen) => {
    setScreen(s);
    if (scroller.current) scroller.current.scrollTop = 0;
  };

  let view: React.ReactNode = null;
  if (screen === "welcome") view = <ScWelcome onNext={() => go("entry")} />;
  else if (screen === "entry") view = <ScEntry onVoice={() => go("voice")} onChips={() => go("chips")} />;
  else if (screen === "voice") view = <ScVoice onDone={() => go("followup")} onSkip={() => go("entry")} />;
  else if (screen === "followup") view = <ScFollowup onDone={() => go("chips")} onSkip={() => go("chips")} />;
  else if (screen === "chips")
    view = (
      <ScChips
        onDone={() => {
          setPlanStatus("forming");
          go("assembling");
        }}
        onBack={() => go("entry")}
      />
    );
  else if (screen === "assembling")
    view = (
      <ScAssembling
        onDone={() => {
          setPlanStatus("forming");
          go("home");
        }}
      />
    );
  else if (screen === "home")
    view = <Home status={planStatus} onResolve={() => setPlanStatus("ready")} onOpenPlan={() => go("plan")} onPlans={() => go("plans")} />;
  else if (screen === "plan")
    view = (
      <MobilePlanA
        onAccept={() => {
          setPlanStatus("confirmed");
          go("accepted");
        }}
      />
    );
  else if (screen === "accepted")
    view = (
      <MobilePlanReady
        onBack={() => go("plan")}
        onHome={() => {
          setPlanStatus("confirmed");
          go("home");
        }}
      />
    );
  else if (screen === "plans")
    view = <PlansTab stretchStatus={stretchStatus} onHome={() => go("home")} onOpenConfirmed={() => go("plan")} onOpenStretch={() => go("stretch")} />;
  else if (screen === "stretch")
    view = <StretchPlan onBack={() => go("plans")} onAccept={() => setStretchStatus("confirmed")} accepted={stretchStatus === "confirmed"} />;

  return (
    <main
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        background: "#14101f",
      }}
    >
      {/* Mobile column. Every screen is designed at ~402px; we center that column. */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 430,
          height: "100dvh",
          background: "var(--aura-bg)",
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(0,0,0,0.25)",
        }}
      >
        <div ref={scroller} style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden" }} className="aura-flow-scroll">
          <div key={screen} style={{ height: "100%", animation: "flowFade 360ms ease both" }}>
            {view}
          </div>
        </div>
      </div>
    </main>
  );
}
