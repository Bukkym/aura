"use client";

// The LIVE Ask Ora sheet: same visual language as the prototype's OraAsk
// (components/aura/screens/app-shell.tsx), but wired to the real agent.
// Voice-first: tap the ring to talk (MediaRecorder -> /api/transcribe), or type
// instead; either way the message goes to /api/ora/chat, where Ora answers
// grounded in the knowledge base and may run plan tools (refine, new plan,
// withdraw). When a tool changes the plan, the sheet updates the live plan
// cache so Home and Plans reflect it immediately.

import { useEffect, useRef, useState } from "react";
import { Ring, Mic, mono } from "../primitives";
import { cacheLivePlan, clearLivePlan } from "../useLivePlan";
import type { PlanResponse } from "@/app/api/plan/create/route";

const ASK_SUGGESTIONS = [
  "A quieter group",
  "Something more outdoorsy",
  "Different people this time",
  "How does matching work?",
];

type Role = "user" | "assistant";
interface Msg {
  role: Role;
  content: string;
  plan?: PlanResponse;
}

type VoiceState = "idle" | "recording" | "transcribing";

function shortWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Toronto" });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" })
    .replace(" ", "")
    .toLowerCase();
  return `${day} · ${time}`;
}

export function OraAskLive({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Reset transient state when the sheet closes; the thread survives a
  // close/reopen so Ora keeps the context of the conversation.
  useEffect(() => {
    if (!open) {
      releaseMic();
      setMode("voice");
      setVoice("idle");
      setError(null);
    }
  }, [open]);
  useEffect(() => releaseMic, []);

  // Keep the newest message in view.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ora/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const data = (await res.json()) as {
        reply?: string;
        plan?: PlanResponse | null;
        toolsUsed?: string[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Sign in to talk to Ora about your plans."
            : (data.error ?? `Ora returned ${res.status}`),
        );
      }
      const plan = data.plan ?? undefined;
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "", plan }]);
      // Reflect tool effects in the live plan cache so Home/Plans update.
      const tools = data.toolsUsed ?? [];
      if (plan) {
        cacheLivePlan(plan, "ready");
      } else if (tools.includes("withdraw_current_plan")) {
        clearLivePlan();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

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
      setVoice("idle");
      await send(text.trim());
    } catch {
      setVoice("idle");
      setMode("text");
      setError("I could not catch that. Type it instead?");
    }
  };

  const startRecording = async () => {
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMode("text");
      setError("Voice is not available here. Type instead?");
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
      setVoice("recording");
    } catch {
      releaseMic();
      setMode("text");
      setError("Ora needs mic access for voice. Type instead?");
    }
  };

  const tapRing = () => {
    if (busy) return;
    if (voice === "idle") {
      void startRecording();
    } else if (voice === "recording") {
      setVoice("transcribing");
      const mr = recorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
      else setVoice("idle");
    }
  };

  const hasThread = messages.length > 0 || busy;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: open ? "auto" : "none" }}>
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(14,11,34,0.42)", backdropFilter: "blur(2px)", opacity: open ? 1 : 0, transition: "opacity 280ms" }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--aura-bg)",
          borderRadius: "26px 26px 0 0",
          padding: "10px 22px 26px",
          boxShadow: "0 -18px 50px rgba(26,21,48,0.22)",
          transform: open ? "translateY(0)" : "translateY(102%)",
          transition: "transform 360ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 4, background: "var(--aura-ink-10)", margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: hasThread ? 12 : 18 }}>
          <Ring size={34} state={busy ? "processing" : "rest"} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>Ask Ora</div>
            <div style={{ fontSize: 12.5, color: "var(--aura-ink-45)" }}>Change a plan, or find something new.</div>
          </div>
        </div>

        {hasThread && (
          <div
            ref={threadRef}
            style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "34vh", overflowY: "auto", padding: "2px 2px 10px" }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
                <div
                  style={{
                    maxWidth: "86%",
                    padding: "8px 12px",
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.45,
                    fontFamily: "var(--font-body)",
                    background: m.role === "user" ? "var(--aura-violet)" : "var(--aura-ink-06, rgba(26,21,48,0.06))",
                    color: m.role === "user" ? "#FAF7F2" : "var(--aura-ink-90)",
                  }}
                >
                  {m.content}
                </div>
                {m.plan && (
                  <div style={{ alignSelf: "stretch", border: "1px solid var(--aura-ink-10)", borderRadius: 14, padding: "10px 12px", background: "var(--aura-bg)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.01em" }}>
                      {m.plan.activityType}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--aura-ink-55)", marginTop: 2 }}>
                      {m.plan.place.name} · {m.plan.place.neighborhood} · {shortWhen(m.plan.dateTime)}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--aura-violet)", marginTop: 2 }}>
                      {m.plan.attendees.length} people
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--aura-ink-45)", fontSize: 13 }}>
                <Ring size={18} state="processing" /> Ora is thinking…
              </div>
            )}
          </div>
        )}

        {error && (
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#B00020", fontFamily: "var(--font-body)" }}>{error}</p>
        )}

        {mode === "voice" ? (
          <>
            {/* Voice-first: the ring is the main way to talk to Ora. */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: hasThread ? "2px 0 2px" : "8px 0 2px" }}>
              <button
                onClick={tapRing}
                aria-label={voice === "recording" ? "Stop talking" : "Tap to talk"}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <Ring size={hasThread ? 64 : 92} state={voice === "recording" ? "recording" : voice === "transcribing" || busy ? "processing" : "idle"} />
              </button>
              <p
                style={{
                  margin: "14px 0 0",
                  fontFamily: mono,
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: voice === "recording" ? "var(--aura-violet)" : "var(--aura-ink-45)",
                }}
              >
                {voice === "recording" ? "listening… tap to stop" : voice === "transcribing" ? "catching that…" : "tap to talk"}
              </p>
            </div>

            {!hasThread && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginTop: 20 }}>
                {ASK_SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => void send(s)} className="chip chip--outline" style={{ cursor: "pointer", marginBottom: 0 }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setMode("text")}
              style={{
                display: "block",
                margin: "16px auto 0",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 13.5,
                color: "var(--aura-ink-45)",
              }}
            >
              Type instead
            </button>
          </>
        ) : (
          // Text is the secondary path; the in-field mic returns to voice.
          <div className="field-group">
            <input
              className="field"
              placeholder="Tell Ora what you'd like…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send(input);
              }}
              disabled={busy}
              autoFocus
            />
            <button className="mic" aria-label="Back to voice" onClick={() => setMode("voice")}>
              <Mic />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
