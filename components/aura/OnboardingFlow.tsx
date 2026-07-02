"use client";

// The live onboarding spine: welcome → entry → voice → follow-up → 6-step chip
// capture. The voice path (Phase 4) records real audio, transcribes it via
// /api/transcribe (Whisper), and runs the extraction loop via
// /api/onboarding/converse: Ora either asks one warm follow-up or hands back a
// complete draft. That draft prefills the chip flow, which stays the
// confirm/edit surface. On the final chip submit we map the selections to the
// aura:draft contract, stash it in localStorage, and hand off to /home, which
// holds the just-in-time auth gate (server redirect) and runs the deterministic
// pipeline. localStorage (not sessionStorage) so the draft survives the
// magic-link bounce even when the email link opens in a new tab.
//
// Every voice step degrades gracefully: if the mic, transcription, or the
// converse call fails, we fall through to the chip flow (prefilled with whatever
// we have), so onboarding always completes.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScWelcome, ScEntry, ScVoice, ScFollowup, ScChips } from "./screens/onboarding";
import { PhoneFrame } from "./PhoneFrame";
import {
  draftToSelections,
  mapSelectionsToDraft,
  type Draft,
  type Selections,
} from "./mapDraft";

const STORAGE_KEY = "aura:draft";

type Screen = "welcome" | "entry" | "voice" | "followup" | "chips";

interface ConverseResult {
  done: boolean;
  reply: string;
  draft: Draft;
}

export function OnboardingFlow() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("welcome");
  const go = (s: Screen) => setScreen(s);

  // Voice-agent state: the accumulated utterances, the latest draft, and the
  // follow-up question Ora last asked.
  const [utterances, setUtterances] = useState<string[]>([]);
  const [prefill, setPrefill] = useState<Selections | undefined>();
  const [followupQ, setFollowupQ] = useState("");

  // One voice turn: append the new transcript, ask the converse route what to do
  // next, then either show the follow-up or move to the prefilled chips.
  const handleTranscript = async (text: string) => {
    const next = [...utterances, text];
    setUtterances(next);
    try {
      const res = await fetch("/api/onboarding/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utterances: next }),
      });
      if (!res.ok) throw new Error("converse failed");
      const data = (await res.json()) as ConverseResult;
      setPrefill(draftToSelections(data.draft));
      if (data.done) {
        go("chips");
      } else {
        setFollowupQ(data.reply);
        go("followup");
      }
    } catch {
      // Extraction failed: keep any prefill we already have and let the user
      // finish by tapping through the chips.
      go("chips");
    }
  };

  const finish = (sel: Selections) => {
    try {
      // A fresh profile invalidates any previously cached plan + status.
      sessionStorage.removeItem("aura:plan");
      sessionStorage.removeItem("aura:planStatus");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapSelectionsToDraft(sel)));
    } catch {
      // Storage can fail in private-mode Safari; /home re-prompts if the
      // draft is missing.
    }
    // Hand off with an explicit signup intent so /auth/login creates the
    // account (shouldCreateUser) rather than treating this as a sign-in and
    // rejecting the new email. Already-signed-in users pass straight through
    // login to /home. aura:draft lives in localStorage, so it survives the
    // bounce even if the email link opens a new tab.
    router.push("/auth/login?intent=signup&next=/home");
  };

  let view: React.ReactNode = null;
  if (screen === "welcome") view = <ScWelcome onNext={() => go("entry")} />;
  else if (screen === "entry") view = <ScEntry onVoice={() => go("voice")} onChips={() => go("chips")} />;
  else if (screen === "voice")
    view = (
      <ScVoice
        onTranscript={handleTranscript}
        onSkip={() => go("entry")}
        onUnavailable={() => go("chips")}
      />
    );
  else if (screen === "followup")
    view = (
      <ScFollowup
        prompt={followupQ}
        onTranscript={handleTranscript}
        onSkip={() => go("chips")}
        onUnavailable={() => go("chips")}
      />
    );
  else if (screen === "chips")
    view = <ScChips initial={prefill} onDone={finish} onBack={() => go("entry")} />;

  return <PhoneFrame screenKey={screen}>{view}</PhoneFrame>;
}
