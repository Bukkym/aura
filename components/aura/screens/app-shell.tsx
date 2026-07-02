"use client";

// aura — in-app shell: the earned-wait sequence, Home, and Ask Ora.
// One thing at a time, lots of cream space, Ora as a quiet recurring presence.
// The wait is deliberate: a short assembling beat + a "your group is forming"
// pending state make the Plan feel earned, not too-good-to-be-true.

import { useEffect, useState } from "react";
import { Ring, Swatch, Cal, Mic, StatusIcon, OraBloom, mono } from "../primitives";
import { BottomBar } from "./bottom-bar";
import { PLAN } from "../data";

// ── The earned wait · staged "Ora is working" sequence ──
const ASSEMBLE_STEPS = ["Reading your aura…", "Looking across Berlin…", "47 people share your evenings", "Finding the few who truly fit…"];

export function ScAssembling({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i < ASSEMBLE_STEPS.length - 1) {
      const t = setTimeout(() => setI(i + 1), 1350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [i, onDone]);
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "var(--aura-bg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <OraBloom show />
      <div style={{ position: "relative", textAlign: "center", padding: "0 36px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Ring size={140} state="processing" dark />
        </div>
        <p key={i} style={{ marginTop: 38, fontFamily: "var(--font-body)", fontSize: 16.5, color: "var(--aura-ink-90)", lineHeight: 1.4, animation: "flowFade 500ms ease both" }}>
          {ASSEMBLE_STEPS[i]}
        </p>
      </div>
    </div>
  );
}

// ── Ask Ora · minimal in-app sheet ──
const ASK_SUGGESTIONS = ["Something this weekend", "Move my Plan", "A quieter group", "Just one person to meet"];

export function OraAsk({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sent, setSent] = useState<string | null>(null);
  // Voice is the primary way to talk to Ora; text is the secondary fallback.
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [listening, setListening] = useState(false);
  useEffect(() => {
    if (!open) {
      setSent(null);
      setMode("voice");
      setListening(false);
    }
  }, [open]);
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <Ring size={34} state="rest" />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>Ask Ora</div>
            <div style={{ fontSize: 12.5, color: "var(--aura-ink-45)" }}>Change a plan, or find something new.</div>
          </div>
        </div>

        {sent ? (
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "4px 2px 14px" }}>
            <span style={{ flex: "none", marginTop: 1 }}>
              <Ring size={20} state="rest" />
            </span>
            <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.5, color: "var(--aura-ink-90)" }}>
              On it. I&apos;ll look into <span style={{ color: "var(--aura-violet)", fontStyle: "italic" }}>&quot;{sent.toLowerCase()}&quot;</span> and send something over shortly.
            </p>
          </div>
        ) : mode === "voice" ? (
          <>
            {/* Voice-first: the ring is the main way to talk to Ora. */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 2px" }}>
              <button
                onClick={() => setListening((v) => !v)}
                aria-label={listening ? "Stop talking" : "Tap to talk"}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <Ring size={92} state={listening ? "recording" : "idle"} />
              </button>
              <p
                style={{
                  margin: "20px 0 0",
                  fontFamily: mono,
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: listening ? "var(--aura-violet)" : "var(--aura-ink-45)",
                }}
              >
                {listening ? "listening… tap to stop" : "tap to talk"}
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginTop: 20 }}>
              {ASK_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setSent(s)} className="chip chip--outline" style={{ cursor: "pointer", marginBottom: 0 }}>
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMode("text")}
              style={{
                display: "block",
                margin: "18px auto 0",
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
            <input className="field" placeholder="Type your message…" readOnly style={{ cursor: "default" }} autoFocus />
            <button className="mic" aria-label="Back to voice" onClick={() => setMode("voice")}>
              <Mic />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Home cards per plan status ──
function FormingCard() {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        background: "linear-gradient(160deg, rgba(201,125,255,0.14), rgba(255,123,172,0.08))",
        border: "1px solid var(--aura-ink-10)",
        padding: "26px 22px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <Ring size={40} state="idle" />
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>Your first Plan is forming</div>
          <div style={{ fontSize: 13, color: "var(--aura-violet)", fontWeight: 500, marginTop: 2 }}>Ora is reaching out…</div>
        </div>
      </div>
      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.5, color: "var(--aura-ink-70)" }}>
        Good things take a beat. Ora is bringing the right few people together. You&apos;ll get a nudge the moment your group is set.
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginTop: 16,
          fontFamily: mono,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--aura-ink-45)",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--aura-violet)", animation: "formPulse 1.6s ease-in-out infinite" }} />
        usually ready within a day
      </div>
    </div>
  );
}

function ReadyCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      role="button"
      onClick={onOpen}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        padding: 0,
        border: "1px solid var(--aura-ink-10)",
        borderRadius: 22,
        overflow: "hidden",
        background: "var(--aura-bg)",
        boxShadow: "var(--shadow-card)",
        animation: "flowFade 600ms ease both",
      }}
    >
      <div style={{ position: "relative", height: 150, background: "#1d1413" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/otto-ambience.png" alt="Otto Bar" style={{ display: "block", width: "100%", height: 150, objectFit: "cover" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(22,13,34,0.82), rgba(22,13,34,0.05) 65%)" }} />
        <span
          style={{
            position: "absolute",
            top: 13,
            left: 14,
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#1A1530",
            background: "rgba(250,247,242,0.94)",
            padding: "5px 10px",
            borderRadius: 9999,
            fontWeight: 600,
          }}
        >
          ★ New · ready to review
        </span>
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 13 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: "#FAF7F2", letterSpacing: "0.01em", lineHeight: 1.1 }}>{PLAN.activity}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "rgba(250,247,242,0.9)" }}>
            {PLAN.venue} · {PLAN.hood}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 500, color: "var(--aura-ink-90)" }}>
          <Cal c="var(--aura-violet)" />
          {PLAN.when}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--aura-violet)", fontWeight: 500 }}>
          6 people <span style={{ fontSize: 16 }}>→</span>
        </span>
      </div>
    </div>
  );
}

function ConfirmedCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      role="button"
      onClick={onOpen}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 22,
        padding: "18px 18px",
        border: "1px solid oklch(0.88 0.05 285)",
        background: "oklch(0.975 0.02 285)",
        animation: "flowFade 500ms ease both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.48 0.09 285)" }}>
          <StatusIcon status="confirmed" size={14} /> You&apos;re going
        </span>
        <span style={{ fontSize: 12.5, color: "var(--aura-ink-45)" }}>{PLAN.when}</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "0.01em", lineHeight: 1.1 }}>{PLAN.activity}</div>
      <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 4 }}>
        {PLAN.venue} · {PLAN.hood}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <div style={{ display: "flex" }}>
          {["you", "jonas-b", "mira-k", "yara-s"].map((id, i) => (
            <span key={id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: "50%", border: "2px solid oklch(0.975 0.02 285)" }}>
              {id === "you" ? (
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--aura-violet)",
                    color: "#FAF7F2",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  I
                </span>
              ) : (
                <Swatch id={id} size={26} />
              )}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "var(--aura-violet)", fontWeight: 500 }}>View invite →</span>
      </div>
    </div>
  );
}

// ── Home ──
export function Home({
  status = "forming",
  onOpenPlan,
  onResolve,
  onPlans,
}: {
  status?: "forming" | "ready" | "confirmed";
  onOpenPlan: () => void;
  onResolve: () => void;
  onPlans: () => void;
}) {
  const [ask, setAsk] = useState(false);
  // 'forming' auto-resolves to 'ready' after a beat (the group "comes together").
  useEffect(() => {
    if (status === "forming" && onResolve) {
      const t = setTimeout(onResolve, 4200);
      return () => clearTimeout(t);
    }
  }, [status, onResolve]);

  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.4, filter: "blur(70px)", pointerEvents: "none" }} />

      {/* header */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "56px 22px 12px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 25, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Friday evening</div>
          <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 2 }}>Berlin · Kreuzberg</div>
        </div>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: "-0.02em",
            background: "linear-gradient(102deg, #7752E6, #FF5C9C)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          aura
        </span>
      </div>

      {/* body */}
      <div style={{ position: "relative", flex: 1, overflowY: "auto", padding: "10px 22px 24px" }}>
        <div className="aura-label" style={{ marginBottom: 12 }}>
          {status === "confirmed" ? "Upcoming" : "Your Plan"}
        </div>
        {status === "forming" && <FormingCard />}
        {status === "ready" && <ReadyCard onOpen={onOpenPlan} />}
        {status === "confirmed" && <ConfirmedCard onOpen={onOpenPlan} />}

        {/* quiet secondary content */}
        {status === "confirmed" ? (
          <div style={{ marginTop: 26 }}>
            <div className="aura-label" style={{ marginBottom: 10 }}>
              After this
            </div>
            <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "16px 16px", borderRadius: 18, border: "1px dashed var(--aura-ink-10)" }}>
              <Ring size={26} state="rest" />
              <p style={{ margin: 0, fontSize: 14, color: "var(--aura-ink-55)", lineHeight: 1.45 }}>Ora is already thinking about who you should meet next.</p>
            </div>
          </div>
        ) : (
          <p style={{ marginTop: 22, textAlign: "center", fontSize: 13, color: "var(--aura-ink-45)", lineHeight: 1.5 }}>
            One good Plan at a time. Ora won&apos;t flood you with options.
          </p>
        )}
      </div>

      {/* minimal bottom bar: Home · Ora(ask) · Plans */}
      <BottomBar active="home" onHome={() => {}} onAsk={() => setAsk(true)} onPlans={onPlans} />

      <OraAsk open={ask} onClose={() => setAsk(false)} />
    </div>
  );
}
