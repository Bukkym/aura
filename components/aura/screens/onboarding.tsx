"use client";

// aura — onboarding + entry screens. Welcome → Entry choice → Voice → Follow-up
// → 6-step chip capture. Everything lives on the cream surface; Ora "visits" only
// as a localized bloom centered on the ring during processing, never a flip.

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ring, Wordmark, OraBloom, mono } from "../primitives";
import type { Selections } from "../mapDraft";

// ── Screen 1 · Welcome ──
export function ScWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "var(--aura-bg)",
        color: "var(--aura-ink)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 30px",
      }}
    >
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.6, filter: "blur(64px)" }}
      />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Ring size={108} state="idle" />
        <div style={{ marginTop: 34 }}>
          <Wordmark size={62} />
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--aura-ink-70)", margin: "16px 0 0", lineHeight: 1.5, maxWidth: 280 }}>
          Your people are out there.
          <br />
          Let&apos;s find them.
        </p>
        <button onClick={onNext} className="btn btn--aurora" style={{ marginTop: 36, padding: "0 56px" }}>
          Begin
        </button>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--aura-ink-55)", margin: "20px 0 0" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "var(--aura-violet)", fontWeight: 500, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
      <span className="by-ora" style={{ position: "absolute", bottom: 26, right: 24, color: "var(--aura-ink-40)" }}>
        by Ora
      </span>
    </div>
  );
}

// ── Screen 2 · Entry choice (voice primary · tap-through optional) ──
export function ScEntry({ onVoice, onChips }: { onVoice: () => void; onChips: () => void }) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "var(--aura-bg)",
        color: "var(--aura-ink)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: "var(--bloom-plan)", opacity: 0.5, filter: "blur(70px)" }}
      />
      <div style={{ position: "relative" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 27, letterSpacing: "-0.01em", margin: "0 0 6px", textAlign: "center" }}>
          How should we start?
        </h1>
        <p className="aura-body" style={{ fontSize: 15, color: "var(--aura-ink-70)", textAlign: "center", margin: "0 0 30px" }}>
          Ora learns who you are, then finds your people.
        </p>

        {/* Primary: talk to Ora */}
        <button
          onClick={onVoice}
          style={{
            width: "100%",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            borderRadius: 22,
            padding: "22px 22px",
            color: "#FAF7F2",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(150deg, #5B2EFF, #A237FF 52%, #FF3D9A)",
            boxShadow: "0 16px 40px rgba(120,50,170,0.34)",
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ flex: "none" }}>
              <Ring size={50} state="rest" dark />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19 }}>Talk to Ora</span>
              <span style={{ display: "block", fontSize: 13.5, color: "rgba(250,247,242,0.82)", marginTop: 3, lineHeight: 1.4 }}>
                Say a little about yourself. Most natural way in.
              </span>
            </span>
            <span style={{ fontSize: 20, opacity: 0.8 }}>→</span>
          </div>
          <span style={{ position: "absolute", top: 12, right: 14, fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(250,247,242,0.7)" }}>
            recommended
          </span>
        </button>

        {/* Optional: tap through (text/chips) */}
        <button
          onClick={onChips}
          style={{
            width: "100%",
            marginTop: 14,
            cursor: "pointer",
            textAlign: "left",
            borderRadius: 20,
            padding: "18px 20px",
            background: "var(--aura-bg)",
            border: "1px solid var(--aura-ink-10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--aura-violet-10)",
                color: "var(--aura-violet)",
                fontSize: 20,
              }}
            >
              ⌨
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, color: "var(--aura-ink)" }}>
                Tap through it instead
              </span>
              <span style={{ display: "block", fontSize: 13, color: "var(--aura-ink-55)", marginTop: 2, lineHeight: 1.4 }}>
                Pick from options. No talking.
              </span>
            </span>
            <span style={{ fontSize: 18, color: "var(--aura-ink-40)" }}>→</span>
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Shared voice template (used by Voice + Follow-up) ──
// Records real audio, posts it to /api/transcribe (Whisper), and hands the
// transcript up via onTranscript; the parent runs the extraction loop and
// navigates. If the mic is unavailable or anything fails, onUnavailable falls
// the user through to the chip flow, keeping the honest "still learning to
// listen" framing rather than hard-breaking.
type VoiceState = "idle" | "recording" | "processing";

function VoiceTemplate({
  onTranscript,
  onSkip,
  onUnavailable,
  skipLabel,
  eyebrow,
  prompt,
  ringSize,
  idleHint,
  processingHint,
}: {
  onTranscript: (text: string) => Promise<void>;
  onSkip: () => void;
  onUnavailable: () => void;
  skipLabel: string;
  eyebrow?: string;
  prompt: string;
  ringSize: number;
  idleHint: string;
  processingHint: string;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  // Release the mic if the screen unmounts mid-recording.
  useEffect(() => releaseMic, []);

  const handleStop = async () => {
    releaseMic();
    const type = recorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    try {
      if (blob.size === 0) throw new Error("empty recording");
      const form = new FormData();
      form.append("audio", new File([blob], "audio.webm", { type }));
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error("transcription failed");
      const { text } = (await res.json()) as { text?: string };
      if (!text || !text.trim()) throw new Error("empty transcript");
      await onTranscript(text.trim());
    } catch {
      onUnavailable();
    }
  };

  const startRecording = async () => {
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia || typeof MediaRecorder === "undefined") {
      onUnavailable();
      return;
    }
    try {
      const stream = await md.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = handleStop;
      recorderRef.current = mr;
      mr.start();
      setState("recording");
    } catch {
      releaseMic();
      onUnavailable();
    }
  };

  const tap = () => {
    if (state === "idle") {
      void startRecording();
    } else if (state === "recording") {
      setState("processing");
      const mr = recorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
      else onUnavailable();
    }
  };
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "var(--aura-bg)",
        color: "var(--aura-ink)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--bloom-welcome)",
          opacity: state === "processing" ? 0 : 0.5,
          filter: "blur(64px)",
          transition: "opacity 500ms",
        }}
      />
      <OraBloom show={state === "processing"} />

      <button
        onClick={onSkip}
        style={{
          position: "absolute",
          top: 54,
          left: 22,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          color: state === "processing" ? "rgba(250,247,242,0.7)" : "var(--aura-ink-45)",
        }}
      >
        {skipLabel}
      </button>

      <div style={{ position: "relative", textAlign: "center", maxWidth: 320 }}>
        {eyebrow && state !== "processing" && (
          <p style={{ margin: "0 0 8px", fontFamily: mono, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--aura-violet)" }}>
            {eyebrow}
          </p>
        )}
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: 22,
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
            color: state === "processing" ? "#FAF7F2" : "var(--aura-ink)",
            opacity: state === "recording" ? 0.32 : 1,
            transition: "opacity 400ms, color 400ms",
            margin: "0 0 44px",
          }}
        >
          {state === "processing" ? "" : prompt}
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={tap}
            disabled={state === "processing"}
            style={{ background: "none", border: "none", cursor: state === "processing" ? "default" : "pointer", padding: 0 }}
          >
            <Ring size={ringSize} state={state === "processing" ? "processing" : "idle"} dark={state === "processing"} />
          </button>
        </div>

        <p
          style={{
            marginTop: 34,
            fontFamily: state === "processing" ? "var(--font-body)" : mono,
            fontSize: state === "processing" ? 15 : 12,
            letterSpacing: state === "processing" ? 0 : "0.16em",
            textTransform: state === "processing" ? "none" : "uppercase",
            color: state === "processing" ? "var(--aura-ink-70)" : "var(--aura-ink-45)",
          }}
        >
          {state === "idle" && idleHint}
          {state === "recording" && "tap to stop"}
          {state === "processing" && processingHint}
        </p>
      </div>
    </div>
  );
}

// ── Screen 3 · Voice ──
export function ScVoice({
  onTranscript,
  onSkip,
  onUnavailable,
}: {
  onTranscript: (text: string) => Promise<void>;
  onSkip: () => void;
  onUnavailable: () => void;
}) {
  return (
    <VoiceTemplate
      onTranscript={onTranscript}
      onSkip={onSkip}
      onUnavailable={onUnavailable}
      skipLabel="← back"
      prompt="Tell me about yourself, what you're into, and the kind of people you'd like to meet."
      ringSize={132}
      idleHint="tap to speak"
      processingHint="Reading your aura…"
    />
  );
}

// ── Screen 3.5 · Follow-up loop ──
export function ScFollowup({
  onTranscript,
  onSkip,
  onUnavailable,
  prompt,
}: {
  onTranscript: (text: string) => Promise<void>;
  onSkip: () => void;
  onUnavailable: () => void;
  /** The follow-up question Ora asked for this turn. */
  prompt: string;
}) {
  return (
    <VoiceTemplate
      onTranscript={onTranscript}
      onSkip={onSkip}
      onUnavailable={onUnavailable}
      skipLabel="skip"
      eyebrow="One more thing."
      prompt={prompt}
      ringSize={120}
      idleHint="tap to answer"
      processingHint="Got it…"
    />
  );
}

// ── Chip taxonomy (subsets of the seed-pool vocab from the onboarding spec) ──
const VOCAB = {
  personality: ["curious", "open-minded", "adventurous", "creative", "thoughtful", "chill", "ambitious", "introverted", "easygoing", "passionate"],
  vibe: ["chill", "creative", "cozy", "intellectual", "laid-back", "adventurous", "introspective", "artsy", "genuine", "deep"],
  interests: ["art", "music", "philosophy", "startups", "climbing", "yoga", "cooking", "techno", "vinyl", "books", "design", "indie film", "outdoors", "food"],
  activities: ["dinner parties", "gallery openings", "boulder gym", "lake days", "indie cinema", "museum afternoons", "techno clubs", "book clubs", "brunches", "hiking"],
  hoods: ["Kreuzberg", "Mitte", "Prenzlauer Berg", "Wedding", "Friedrichshain", "Neukölln", "Tiergarten", "Charlottenburg"],
  avail: ["weekday evenings", "weekday mornings", "weekend mornings", "weekend afternoons", "weekend evenings", "anytime"],
  budget: ["low", "mid", "high", "any"],
  connection: ["people to do things with", "deep connections", "a friend group", "help finding my footing here"],
  social: ["small-group", "one-on-one", "low-pressure", "spontaneous", "consistent", "intimate", "casual", "high-energy", "deep conversations", "lively"],
};

interface ChipGroup {
  key: string;
  label: string;
  opts: string[];
  min?: number;
  anywhere?: boolean;
  single?: boolean;
  def?: string;
}
interface Step {
  ora: string;
  groups: ChipGroup[];
}

const STEPS: Step[] = [
  {
    ora: "First, you. Pick the words that feel like you on a normal week.",
    groups: [
      { key: "p1", label: "You're", opts: VOCAB.personality, min: 2 },
      { key: "v1", label: "Your vibe", opts: VOCAB.vibe, min: 2 },
    ],
  },
  {
    ora: "What pulls your attention. And what you actually do.",
    groups: [
      { key: "in1", label: "Into", opts: VOCAB.interests, min: 2 },
      { key: "ac1", label: "You do", opts: VOCAB.activities, min: 1 },
    ],
  },
  {
    ora: "Where you are. When you're free.",
    groups: [
      { key: "h1", label: "Around", opts: VOCAB.hoods, min: 1, anywhere: true },
      { key: "av1", label: "Free", opts: VOCAB.avail, min: 1 },
      { key: "b1", label: "Budget", opts: VOCAB.budget, min: 1, single: true, def: "any" },
    ],
  },
  {
    ora: "Now them. What kind of connection are you after.",
    groups: [
      { key: "c1", label: "Looking for", opts: VOCAB.connection, min: 1 },
      { key: "p2", label: "People who are", opts: VOCAB.personality, min: 2 },
    ],
  },
  {
    ora: "Last one. What you'd want to share with them.",
    groups: [
      { key: "in2", label: "Shared interests", opts: VOCAB.interests, min: 1 },
      { key: "s1", label: "How you'd hang", opts: VOCAB.social, min: 1 },
    ],
  },
];

function StepChip({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={"chip " + (on ? "chip--bold" : "chip--outline")} style={{ cursor: "pointer", marginBottom: 0 }}>
      {children}
    </button>
  );
}

// ── Screen 4 · Chip flow (data-driven, 6 steps, empty start + min-gating) ──
export function ScChips({
  onDone,
  onBack,
  initial,
}: {
  onDone: (sel: Selections) => void;
  onBack: () => void;
  /** Prefilled selections from the voice agent (Phase 4). Seeds the chips so the
   *  flow becomes a confirm/edit surface; falls back to empty + budget defaults. */
  initial?: Selections;
}) {
  const initSel = () => {
    const s: Selections = {};
    STEPS.forEach((st) =>
      st.groups.forEach((g) => {
        const seeded = initial?.[g.key];
        s[g.key] = seeded && seeded.length > 0 ? seeded : g.def ? [g.def] : [];
      }),
    );
    return s;
  };
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<Selections>(initSel);
  const st = STEPS[step];

  const toggle = (g: ChipGroup, opt: string) =>
    setSel((prev) => {
      const cur = prev[g.key] || [];
      let next: string[];
      if (g.single) next = [opt];
      else if (opt === "__anywhere") next = ["Anywhere in Berlin"];
      else {
        const without = cur.filter((x) => x !== "Anywhere in Berlin");
        next = without.includes(opt) ? without.filter((x) => x !== opt) : [...without, opt];
      }
      return { ...prev, [g.key]: next };
    });

  const unmet = st.groups.filter((g) => {
    const arr = sel[g.key] || [];
    const n = arr.filter((x) => x !== "Anywhere in Berlin").length + (arr.includes("Anywhere in Berlin") ? 1 : 0);
    return n < (g.min || 0);
  });
  const ready = unmet.length === 0;
  const note = ready
    ? ""
    : "Pick " +
      unmet
        .map((g) => {
          const have = (sel[g.key] || []).length;
          const need = (g.min || 0) - have;
          return need + " more " + g.label.toLowerCase();
        })
        .join(" · ");

  const next = () => {
    if (!ready) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else onDone(sel);
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
    else onBack();
  };

  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column" }}>
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: "var(--bloom-plan)", opacity: 0.4, filter: "blur(72px)", pointerEvents: "none" }}
      />

      {/* top: back + progress bars */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "52px 22px 6px" }}>
        <button onClick={back} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--aura-ink-45)", padding: 0, flex: "none" }}>
          ←
        </button>
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{ height: 4, flex: 1, borderRadius: 4, background: i <= step ? "var(--aura-violet)" : "var(--aura-ink-10)", transition: "background 300ms" }}
            />
          ))}
        </div>
        <span style={{ fontFamily: mono, fontSize: 11, color: "var(--aura-ink-40)", flex: "none" }}>
          {step + 1}/{STEPS.length}
        </span>
      </div>

      {/* Ora prompt + groups (scrolls) */}
      <div style={{ position: "relative", flex: 1, overflowY: "auto", padding: "10px 22px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 22 }}>
          <span style={{ flex: "none", marginTop: 2 }}>
            <Ring size={26} state="rest" />
          </span>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 19, lineHeight: 1.32, letterSpacing: "-0.01em", margin: 0 }}>{st.ora}</p>
        </div>
        {st.groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 11 }}>
              <span className="aura-label">{g.label}</span>
              {g.min && g.min > 1 && <span style={{ fontSize: 11.5, color: "var(--aura-ink-40)" }}>pick {g.min}+</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              {g.anywhere && (
                <StepChip on={(sel[g.key] || []).includes("Anywhere in Berlin")} onClick={() => toggle(g, "__anywhere")}>
                  Anywhere in Berlin
                </StepChip>
              )}
              {g.opts.map((opt) => (
                <StepChip key={opt} on={(sel[g.key] || []).includes(opt)} onClick={() => toggle(g, opt)}>
                  {opt}
                </StepChip>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* sticky CTA + quiet coverage note */}
      <div style={{ position: "relative", padding: "10px 22px 20px", background: "linear-gradient(to top, var(--aura-bg) 64%, transparent)" }}>
        <div style={{ height: 18, textAlign: "center", marginBottom: 6, fontSize: 12.5, color: "var(--aura-ink-45)", opacity: ready ? 0 : 1, transition: "opacity 200ms" }}>
          {note}
        </div>
        <button onClick={next} disabled={!ready} className="btn btn--aurora" style={{ width: "100%", whiteSpace: "nowrap" }}>
          {step < STEPS.length - 1 ? "Next →" : "Find my people →"}
        </button>
      </div>
    </div>
  );
}
