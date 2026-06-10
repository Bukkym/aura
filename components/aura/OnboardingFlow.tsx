"use client";

// The live onboarding spine: welcome → entry → voice → follow-up → 6-step chip
// capture. Voice is a non-AI stub (records nothing, just paces the Ora moment).
// On the final chip submit we map the selections to the aura:draft contract,
// stash it in sessionStorage, and hand off to /plan, which holds the
// just-in-time auth gate (server redirect) and runs the deterministic pipeline.
// aura:draft survives the magic-link bounce because it's the same tab.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScWelcome, ScEntry, ScVoice, ScFollowup, ScChips } from "./screens/onboarding";
import { PhoneFrame } from "./PhoneFrame";
import { mapSelectionsToDraft, type Selections } from "./mapDraft";

const STORAGE_KEY = "aura:draft";

type Screen = "welcome" | "entry" | "voice" | "followup" | "chips";

export function OnboardingFlow() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("welcome");
  const go = (s: Screen) => setScreen(s);

  const finish = (sel: Selections) => {
    try {
      // A fresh profile invalidates any previously cached plan + status.
      sessionStorage.removeItem("aura:plan");
      sessionStorage.removeItem("aura:planStatus");
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mapSelectionsToDraft(sel)));
    } catch {
      // sessionStorage can fail in private-mode Safari; /home re-prompts if the
      // draft is missing.
    }
    router.push("/home");
  };

  let view: React.ReactNode = null;
  if (screen === "welcome") view = <ScWelcome onNext={() => go("entry")} />;
  else if (screen === "entry") view = <ScEntry onVoice={() => go("voice")} onChips={() => go("chips")} />;
  else if (screen === "voice") view = <ScVoice onDone={() => go("followup")} onSkip={() => go("entry")} />;
  else if (screen === "followup") view = <ScFollowup onDone={() => go("chips")} onSkip={() => go("chips")} />;
  else if (screen === "chips") view = <ScChips onDone={finish} onBack={() => go("entry")} />;

  return <PhoneFrame screenKey={screen}>{view}</PhoneFrame>;
}
