"use client";

import Link from "next/link";
import { useState } from "react";
import { AuroraRing, type RingState } from "@/components/AuroraRing";

export default function VoicePromptPage() {
  const [state, setState] = useState<RingState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);

  // Stub interaction — real flow will use MediaRecorder + /api/transcribe.
  // Tap once to start, tap again to stop. Stop triggers a fake processing → review cycle.
  function handleRingTap() {
    if (state === "idle") {
      setState("recording");
      return;
    }
    if (state === "recording") {
      setState("processing");
      // Simulate Whisper roundtrip
      setTimeout(() => {
        setTranscript(
          "I just moved to Berlin from Lisbon. I'm working on a side project and like climbing on weekends. Looking for chill, ambitious people who actually do stuff."
        );
        setState("rest");
      }, 2400);
    }
  }

  // Ora "moment": only during processing the surface flips to deep indigo.
  // Everything else lives on the warm Aura cream surface.
  const isOraMoment = state === "processing";

  const promptOpacity = state === "recording" ? "opacity-30" : "opacity-100";

  return (
    <main
      className={`relative min-h-dvh w-full overflow-hidden transition-colors duration-500 ${
        isOraMoment ? "bg-ora-bg text-ora-light" : "bg-aura-bg text-aura-ink"
      }`}
    >
      {/* Background bloom — switches with state */}
      {isOraMoment ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 blur-3xl animate-fade-in"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 40%, #A237FF 0%, transparent 60%), radial-gradient(50% 50% at 70% 70%, #FF3D9A 0%, transparent 70%)",
          }}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(45% 45% at 25% 25%, rgba(255, 123, 172, 0.22) 0%, transparent 70%), radial-gradient(40% 40% at 75% 75%, rgba(201, 125, 255, 0.18) 0%, transparent 75%)",
          }}
        />
      )}

      <Link
        href="/"
        className={`absolute left-5 top-5 text-sm transition hover:opacity-100 ${
          isOraMoment ? "text-ora-light/60" : "text-aura-ink/50"
        }`}
      >
        ← back
      </Link>

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        {/* The ring is the only interactive element. Tap to start, tap to stop. */}
        <button
          type="button"
          onClick={handleRingTap}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-aura-violet/50"
          aria-label={
            state === "idle"
              ? "Start recording"
              : state === "recording"
                ? "Stop recording"
                : state === "processing"
                  ? "Processing"
                  : "Recording complete"
          }
        >
          <AuroraRing size={200} state={state} />
        </button>

        {state !== "rest" && (
          <>
            <h1
              className={`font-display mt-12 max-w-xl text-2xl font-medium tracking-tight transition-opacity duration-500 sm:text-3xl ${promptOpacity}`}
            >
              Tell me about yourself, what you&apos;re into, and the kind of
              people you&apos;d like to meet.
            </h1>
            <p
              className={`mt-4 max-w-md text-sm transition-opacity duration-500 ${promptOpacity} ${
                isOraMoment ? "text-ora-light/60" : "text-aura-ink/55"
              }`}
            >
              {state === "recording"
                ? "tap to stop"
                : state === "processing"
                  ? "Reading your aura..."
                  : "Take your time. Speak however feels natural."}
            </p>
          </>
        )}

        {state === "rest" && transcript && (
          <div className="mt-12 w-full max-w-xl animate-fade-in space-y-6">
            <p className="text-sm text-aura-ink/55">You said:</p>
            <p className="text-base leading-relaxed text-aura-ink">
              {transcript}
            </p>
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/chips"
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-aura-violet px-6 text-sm font-medium text-aura-bg transition hover:bg-ora-violet sm:w-auto"
              >
                Sounds right →
              </Link>
              <button
                type="button"
                onClick={() => {
                  setTranscript(null);
                  setState("idle");
                }}
                className="text-sm text-aura-ink/55 underline-offset-4 transition hover:text-aura-ink hover:underline"
              >
                Let me try again
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
