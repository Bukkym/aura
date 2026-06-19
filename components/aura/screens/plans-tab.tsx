"use client";

// aura — Plans tab + the "Ora stretched your usual preferences" surprise moment.
//
// 1. PlansTab — the real screen behind the bottom-bar "Plans": what's coming up
//    (the confirmed Plan + anything new Ora sent) and a quiet history.
// 2. StretchPlan — the delight beat. Ora has learned this person keeps Plans
//    small, sends a bigger table on purpose, admits the stretch, and names
//    something the user never told it. The "I can't explain how it knew" beat.

import { useEffect, useState } from "react";
import { Ring, Swatch, Cal, Vibe, Stack, Seal, auraHue, mono } from "../primitives";
import { BottomBar } from "./bottom-bar";
import { OraAsk } from "./app-shell";
import { PLAN, SUPPER, SUPPER_GUESTS, PAST, PastPlan, Guest } from "../data";

// ── New-from-Ora teaser. Aurora hairline edge marks it as the one worth a tap. ──
function StretchTeaser({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      role="button"
      onClick={onOpen}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: 22,
        padding: 1.5,
        background: "linear-gradient(135deg, #7752E6, #A237FF 45%, #FF5C9C)",
        boxShadow: "0 16px 40px rgba(120,50,170,0.20)",
        animation: "flowFade 600ms ease both",
      }}
    >
      <div style={{ borderRadius: 20.5, background: "var(--aura-bg)", padding: "18px 18px 16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 13 }}>
          <Ring size={34} state="idle" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--aura-violet)", fontWeight: 600 }}>New from Ora</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em", marginTop: 2 }}>Ora stretched your usual.</div>
          </div>
          <span style={{ fontSize: 18, color: "var(--aura-violet)" }}>→</span>
        </div>
        <p style={{ margin: "0 0 14px", fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.5, color: "var(--aura-ink-70)" }}>
          A bigger table than you&apos;d ever pick. I think you&apos;ll like it anyway. Here&apos;s why.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack guests={SUPPER_GUESTS.map((g) => g.id)} size={24} />
          <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--aura-ink-45)" }}>nine at the table</span>
        </div>
      </div>
    </div>
  );
}

// The supper, once accepted — sits in Coming up as a confirmed entry.
function SupperConfirmed({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      role="button"
      onClick={onOpen}
      style={{ cursor: "pointer", borderRadius: 22, padding: "18px 18px", border: "1px solid oklch(0.88 0.05 285)", background: "oklch(0.975 0.02 285)", animation: "flowFade 500ms ease both" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.48 0.09 285)" }}>
          <Seal size={14} /> You&apos;re going
        </span>
        <span style={{ fontSize: 12.5, color: "var(--aura-ink-45)" }}>{SUPPER.when}</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "0.01em", lineHeight: 1.1 }}>{SUPPER.activity}</div>
      <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 4 }}>
        {SUPPER.venue} · {SUPPER.hood}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <Stack guests={SUPPER_GUESTS.slice(0, 4).map((g) => g.id)} size={26} ring="oklch(0.975 0.02 285)" />
        <span style={{ fontSize: 13, color: "var(--aura-violet)", fontWeight: 500 }}>View Plan →</span>
      </div>
    </div>
  );
}

// The confirmed first Plan (gallery hop) with its photo.
function ConfirmedGallery({ onOpen }: { onOpen: () => void }) {
  return (
    <div role="button" onClick={onOpen} style={{ cursor: "pointer", border: "1px solid var(--aura-ink-10)", borderRadius: 22, overflow: "hidden", background: "var(--aura-bg)", boxShadow: "var(--shadow-card)" }}>
      <div style={{ position: "relative", height: 118 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/otto-ambience.png" alt="Otto Bar" style={{ display: "block", width: "100%", height: 118, objectFit: "cover" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(22,13,34,0.82), rgba(22,13,34,0.04) 66%)" }} />
        <span
          style={{
            position: "absolute",
            top: 12,
            left: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#1A1530",
            background: "rgba(250,247,242,0.94)",
            padding: "5px 10px",
            borderRadius: 9999,
            fontWeight: 600,
          }}
        >
          <Seal size={12} /> You&apos;re going
        </span>
        <div style={{ position: "absolute", left: 15, right: 15, bottom: 12 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#FAF7F2", letterSpacing: "0.01em", lineHeight: 1.1 }}>{PLAN.activity}</div>
          <div style={{ marginTop: 3, fontSize: 12.5, color: "rgba(250,247,242,0.9)" }}>
            {PLAN.venue} · {PLAN.hood}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 500, color: "var(--aura-ink-90)" }}>
          <Cal c="var(--aura-violet)" />
          {PLAN.when}
        </span>
        <span style={{ fontSize: 13, color: "var(--aura-violet)", fontWeight: 500 }}>You + 6 →</span>
      </div>
    </div>
  );
}

function PastRow({ p }: { p: PastPlan }) {
  return (
    <div style={{ padding: "16px 16px", borderRadius: 18, border: "1px solid var(--aura-ink-06)", background: "var(--aura-bg)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "0.005em", color: "var(--aura-ink-70)" }}>{p.activity}</span>
        <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--aura-ink-40)", whiteSpace: "nowrap" }}>{p.when}</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--aura-ink-45)", marginTop: 3 }}>
        {p.venue} · {p.hood}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <Stack guests={p.guests} size={22} />
        <span style={{ fontSize: 12.5, color: "var(--aura-ink-45)", whiteSpace: "nowrap" }}>You + {p.count - 1}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--aura-ink-06)" }}>
        <span style={{ flex: "none", marginTop: 1 }}>
          <Ring size={15} state="rest" />
        </span>
        <span style={{ fontSize: 13.5, fontStyle: "italic", color: "var(--aura-violet)", lineHeight: 1.4, opacity: 0.85 }}>{p.recap}</span>
      </div>
    </div>
  );
}

export function PlansTab({
  stretchStatus = "new",
  onHome,
  onOpenConfirmed,
  onOpenStretch,
}: {
  stretchStatus?: "new" | "confirmed";
  onHome: () => void;
  onOpenConfirmed: () => void;
  onOpenStretch: () => void;
}) {
  const [ask, setAsk] = useState(false);
  const comingCount = 2; // gallery hop + the supper (new or confirmed)
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-plan)", opacity: 0.34, filter: "blur(72px)", pointerEvents: "none" }} />

      {/* header */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "56px 22px 12px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 25, letterSpacing: "-0.01em" }}>Your Plans</div>
          <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 2 }}>Berlin · {comingCount} coming up</div>
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
      <div style={{ position: "relative", flex: 1, overflowY: "auto", padding: "8px 22px 26px" }}>
        <div className="aura-label" style={{ marginBottom: 12 }}>
          Coming up
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {stretchStatus === "new" ? <StretchTeaser onOpen={onOpenStretch} /> : <SupperConfirmed onOpen={onOpenStretch} />}
          <ConfirmedGallery onOpen={onOpenConfirmed} />
        </div>

        <div className="aura-label" style={{ margin: "28px 0 12px" }}>
          Earlier
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {PAST.map((p) => (
            <PastRow key={p.id} p={p} />
          ))}
        </div>

        <p style={{ marginTop: 22, textAlign: "center", fontSize: 13, color: "var(--aura-ink-45)", lineHeight: 1.5 }}>
          Ora keeps one good Plan in front of you at a time. The rest stays out of the way.
        </p>
      </div>

      <BottomBar active="plans" onHome={onHome} onAsk={() => setAsk(true)} onPlans={() => {}} />
      <OraAsk open={ask} onClose={() => setAsk(false)} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   THE STRETCH — surprise reveal + the stretched Plan, one scrolling screen.
   ════════════════════════════════════════════════════════════════════════════ */

// Ora's lines, revealed one at a time so it reads as spoken, not printed.
const STRETCH_LINES: { t: string; emph?: boolean }[] = [
  { t: "You keep your Plans small. Four people, faces you can really talk to. I almost didn't send you this one. It seats nine." },
  { t: "But I've watched where you actually light up, and it isn't the quiet table. It's the loud one, three conversations deep, the night you stay at long after you meant to leave." },
  { t: "You never told me that. I just kept noticing.", emph: true },
];

// The quiet "usual vs this" contrast. Typographic, never a chart or a metric.
function UsualVsThis() {
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "stretch", gap: 12, marginTop: 26 }}>
      <div style={{ flex: 1, padding: "14px 15px", borderRadius: 16, border: "1px solid var(--aura-ink-10)", background: "var(--aura-bg)" }}>
        <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--aura-ink-40)", marginBottom: 9 }}>Your usual</div>
        <Stack guests={["yara-s", "anton-d", "theo-r"]} size={22} />
        <div style={{ fontSize: 13, color: "var(--aura-ink-55)", marginTop: 9 }}>Three or four. Always.</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", color: "var(--aura-ink-40)", fontSize: 17 }}>→</div>
      <div
        style={{
          flex: 1,
          padding: "14px 15px",
          borderRadius: 16,
          position: "relative",
          overflow: "hidden",
          border: "1px solid transparent",
          background: "linear-gradient(var(--aura-bg), var(--aura-bg)) padding-box, linear-gradient(135deg, #A237FF, #FF5C9C) border-box",
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--aura-violet)", marginBottom: 9, fontWeight: 600 }}>This Thursday</div>
        <Stack guests={SUPPER_GUESTS.map((g) => g.id)} size={22} />
        <div style={{ fontSize: 13, color: "var(--aura-ink-70)", marginTop: 9, fontWeight: 500 }}>Nine at the table.</div>
      </div>
    </div>
  );
}

function GuestIntro({ g }: { g: Guest }) {
  const [open, setOpen] = useState(false);
  const hue = auraHue(g.id);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{ cursor: "pointer", background: `oklch(0.967 0.02 ${hue})`, border: `1px solid oklch(0.91 0.03 ${hue})`, borderRadius: 16, padding: "13px 14px", marginBottom: 9, position: "relative" }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Swatch id={g.id} size={38} />
        <div style={{ flex: 1, minWidth: 0, paddingRight: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 16.5 }}>{g.name}</span>
            {g.host && (
              <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: `oklch(0.5 0.13 ${hue})`, background: `oklch(0.93 0.045 ${hue})`, padding: "2px 7px", borderRadius: 9999 }}>
                host
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: "var(--aura-ink-70)", marginTop: 2, lineHeight: 1.4 }}>{g.role}</div>
        </div>
        <span style={{ position: "absolute", top: 14, right: 14, color: `oklch(0.6 0.1 ${hue})`, fontSize: 15, lineHeight: 1, transform: open ? "rotate(90deg)" : "none", transition: "transform 240ms var(--ease-out)" }}>
          →
        </span>
      </div>
      {g.ora && open && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 11, paddingTop: 11, borderTop: `1px solid oklch(0.91 0.03 ${hue})` }}>
          <span style={{ flex: "none", marginTop: 1 }}>
            <Ring size={14} state="rest" />
          </span>
          <span style={{ fontSize: 13.5, fontStyle: "italic", color: "var(--aura-violet)", lineHeight: 1.4 }}>{g.ora}</span>
        </div>
      )}
    </div>
  );
}

export function StretchPlan({ onBack, onAccept, accepted = false }: { onBack: () => void; onAccept: () => void; accepted?: boolean }) {
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(STRETCH_LINES.length);
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setRevealed(n);
      if (n >= STRETCH_LINES.length) clearInterval(id);
    }, 900);
    return () => clearInterval(id);
  }, []);
  const featured = SUPPER_GUESTS.filter((g) => g.ora);
  const rest = SUPPER_GUESTS.filter((g) => !g.ora);

  return (
    <>
      <div style={{ position: "relative", minHeight: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden" }}>
        {/* warm bloom, contained, behind the reveal only */}
        <div aria-hidden style={{ position: "absolute", top: -40, left: 0, right: 0, height: 520, pointerEvents: "none", background: "var(--bloom-welcome)", opacity: 0.62, filter: "blur(66px)" }} />

        {/* top bar */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 20px 6px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, color: "var(--aura-ink-45)" }}>
            ← Plans
          </button>
          <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--aura-ink-40)" }}>Plan 004</span>
        </div>

        {/* ── Act 1 · the reveal ── */}
        <div style={{ position: "relative", zIndex: 1, padding: "18px 24px 4px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Ring size={72} state="idle" />
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--aura-violet)", margin: "20px 0 12px" }}>Ora stretched a little</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 27, letterSpacing: "-0.015em", lineHeight: 1.14, margin: 0, maxWidth: 300, textWrap: "balance" }}>I think you&apos;ll like this one.</h1>

          <div style={{ marginTop: 22, maxWidth: 330, display: "flex", flexDirection: "column", gap: 16 }}>
            {STRETCH_LINES.map((l, i) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: l.emph ? 17 : 15.5,
                  lineHeight: 1.55,
                  fontStyle: l.emph ? "italic" : "normal",
                  color: l.emph ? "var(--aura-violet)" : "var(--aura-ink-70)",
                  opacity: i < revealed ? 1 : 0,
                  transform: i < revealed ? "none" : "translateY(8px)",
                  transition: "opacity 600ms ease, transform 600ms cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                {l.t}
              </p>
            ))}
          </div>

          <div style={{ opacity: revealed >= STRETCH_LINES.length ? 1 : 0, transition: "opacity 600ms ease 200ms", width: "100%", maxWidth: 360 }}>
            <UsualVsThis />
          </div>
        </div>

        {/* transition into the table */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14, padding: "30px 24px 6px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--aura-ink-10)" }} />
          <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--aura-ink-45)" }}>Here&apos;s the table</span>
          <div style={{ flex: 1, height: 1, background: "var(--aura-ink-10)" }} />
        </div>

        {/* ── Act 2 · the stretched Plan ── */}
        <div style={{ position: "relative", zIndex: 1, padding: "14px 20px 30px" }}>
          <div style={{ background: "var(--aura-bg)", border: "1px solid var(--aura-ink-10)", borderRadius: 22, boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
            {/* header */}
            <div style={{ padding: "20px 20px 16px", background: "linear-gradient(158deg, rgba(255,123,172,0.18) 0%, rgba(201,125,255,0.12) 48%, rgba(250,247,242,0) 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
                <Cal c="var(--aura-violet)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--aura-violet)" }}>{SUPPER.when}</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 25, lineHeight: 1.08, letterSpacing: "0.01em" }}>{SUPPER.activity}</div>
              <div className="aura-body" style={{ marginTop: 7, fontSize: 15 }}>
                {SUPPER.venue} <span style={{ color: "var(--aura-ink-55)" }}>· {SUPPER.hood}</span>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 12,
                  padding: "5px 11px",
                  borderRadius: 9999,
                  background: "var(--aura-ink-06)",
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--aura-ink-55)",
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: 5, background: "var(--aura-violet)" }} /> A table nobody posts about
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                {SUPPER.vibes.map((v) => (
                  <Vibe key={v}>{v}</Vibe>
                ))}
              </div>
            </div>

            {/* body */}
            <div style={{ padding: "4px 20px 20px" }}>
              <div style={{ height: 1, background: "var(--aura-ink-10)", margin: "18px 0" }} />
              <div className="aura-label" style={{ marginBottom: 8 }}>
                Why Ora sent this
              </div>
              <p className="aura-body" style={{ color: "var(--aura-ink-70)", margin: 0, fontSize: 15 }}>
                {SUPPER.why}
              </p>

              <div style={{ height: 1, background: "var(--aura-ink-10)", margin: "20px 0" }} />
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="aura-label">The nine</div>
                <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--aura-ink-45)" }}>you + 8</span>
              </div>
              {featured.map((g) => (
                <GuestIntro key={g.id} g={g} />
              ))}
              {/* the rest of the table, compact */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "6px 2px 2px" }}>
                {rest.map((g) => (
                  <div key={g.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 58 }}>
                    <Swatch id={g.id} size={36} />
                    <span style={{ fontSize: 12, color: "var(--aura-ink-70)", whiteSpace: "nowrap" }}>{g.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <span className="by-ora" style={{ position: "absolute", bottom: 16, right: 20, color: "var(--aura-ink-40)" }}>
          by Ora
        </span>
      </div>

      {/* sticky CTA */}
      <div style={{ position: "sticky", bottom: 0, zIndex: 30, marginTop: -8 }}>
        <div style={{ padding: "34px 20px 18px", background: "linear-gradient(to top, var(--aura-bg) 44%, rgba(250,247,242,0.7) 76%, rgba(250,247,242,0))" }}>
          {!accepted ? (
            <>
              <button onClick={onAccept} className="btn btn--aurora" style={{ width: "100%", whiteSpace: "nowrap" }}>
                I trust you. I&apos;m in →
              </button>
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <button onClick={onBack} className="btn btn--ghost" style={{ color: "var(--aura-ink-55)", fontSize: 13.5 }}>
                  Not this one, Ora
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onBack}
              style={{
                width: "100%",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                padding: "15px",
                borderRadius: 9999,
                background: "oklch(0.95 0.04 285)",
                color: "oklch(0.4 0.09 285)",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 16,
                boxShadow: "0 12px 28px rgba(119,82,230,0.18)",
              }}
            >
              <Seal size={18} /> You&apos;re in. See it in Plans →
            </button>
          )}
        </div>
      </div>
    </>
  );
}
