"use client";

// Data-driven Plan card + accepted handoff for the live /plan route. Same
// pixel-faithful visuals as the prototype's MobilePlanA (postcard header) and
// MobilePlanReady, but fed by the real PlanResponse from /api/plan/create
// (deterministic matching, no AI). Ora's per-person aside is a light template
// over the strongest shared signal, not an LLM line.

import { useState } from "react";
import { Ring, Swatch, CheckSeal, auraHue, tintChip } from "../primitives";
import type { AttendeeView, PlanResponse } from "@/app/api/plan/create/route";
import type { PlanStatus } from "@/types";

// ── helpers ──
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Toronto" });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" })
    .replace(" ", "")
    .toLowerCase();
  return `${day} · ${time}`;
}

// A short human description of a candidate, composed from their own chips.
function fitLine(a: AttendeeView): string {
  const s = a.selfExtracted;
  const parts: string[] = [];
  if (s.interests?.length) parts.push(s.interests.slice(0, 2).join(", "));
  if (s.activityTypes?.length) parts.push(s.activityTypes[0]);
  if (parts.length === 0 && s.personality?.length) parts.push(s.personality.slice(0, 2).join(", "));
  return cap(parts.join(" · "));
}

// A light, deterministic matchmaker aside from the strongest shared signal.
// Phrased as a suggestion, not a certainty: real similarity is only a weak
// predictor of clicking, and it's the meeting that decides (see
// technical/08-future-considerations.md), so we hedge rather than assert.
function oraAside(a: AttendeeView): string | null {
  const e = a.explanation;
  if (e.sharedInterests?.length) return `You might click over ${e.sharedInterests[0]}.`;
  if (e.matchedPersonalityTraits?.length) return `Close to the ${e.matchedPersonalityTraits[0]} energy you asked for.`;
  if (e.sharedActivityTypes?.length) return `Something you'd probably both show up for: ${e.sharedActivityTypes[0]}.`;
  return null;
}

function PersonIntro({ a }: { a: AttendeeView }) {
  const [open, setOpen] = useState(false);
  const hue = auraHue(a.userId);
  const aside = oraAside(a);
  const e = a.explanation;
  const shared = [...(e.sharedInterests ?? []), ...(e.sharedActivityTypes ?? [])].slice(0, 6);
  const rows: [string, string[]][] = [
    ["Both into", e.sharedInterests ?? []],
    ["Also do", e.sharedActivityTypes ?? []],
    ["The energy you described", e.matchedPersonalityTraits ?? []],
    ["Social style", e.sharedSocialPreferences ?? []],
    ["Where you both are", e.sharedLifeContext ?? []],
  ];
  const hasDetail = rows.some(([, v]) => v.length > 0);

  return (
    <div
      onClick={() => hasDetail && setOpen(!open)}
      style={{
        position: "relative",
        background: `oklch(0.967 0.02 ${hue})`,
        border: `1px solid oklch(0.91 0.03 ${hue})`,
        borderRadius: 18,
        padding: "14px 15px",
        marginBottom: 10,
        cursor: hasDetail ? "pointer" : "default",
      }}
    >
      {hasDetail && (
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontSize: 16,
            lineHeight: 1,
            color: `oklch(0.6 0.1 ${hue})`,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 240ms var(--ease-out)",
          }}
        >
          →
        </span>
      )}
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <Swatch id={a.userId} name={a.displayName} size={42} />
        <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: `oklch(0.5 0.13 ${hue})` }}>{a.displayName}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 15.5, lineHeight: 1.42, color: "var(--aura-ink-90)", marginTop: 3 }}>{fitLine(a) || "Someone Ora picked for you"}</div>
        </div>
      </div>
      {aside && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 11 }}>
          <span style={{ marginTop: 1, flex: "none" }}>
            <Ring size={15} state="rest" />
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontStyle: "italic", color: "var(--aura-violet)", lineHeight: 1.4 }}>{aside}</span>
        </div>
      )}
      {open && hasDetail && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid oklch(0.91 0.03 ${hue})` }}>
          {shared.length > 0 && (
            <>
              <div className="aura-label" style={{ marginBottom: 8 }}>
                What you share
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
                {shared.map((s) => (
                  <span key={s} style={tintChip(hue)}>
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}
          {rows
            .filter(([, v]) => v.length > 0)
            .map(([k, v]) => (
              <div key={k} style={{ fontSize: 14, lineHeight: 1.7 }}>
                <span style={{ color: "var(--aura-ink-45)" }}>{k}: </span>
                <span style={{ color: "var(--aura-ink-90)", fontWeight: 500 }}>{v.join(", ")}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function CardView({ plan, onAccept, onBack }: { plan: PlanResponse; onAccept: () => void; onBack?: () => void }) {
  const when = formatWhen(plan.dateTime);
  const stack = plan.attendees.slice(0, 4);
  // Recurrence line ("Ada and Nadia again, plus one new") is the differentiator,
  // but it needs the feedback loop to re-seat liked people. Null until that ships;
  // the layout already supports it, so it lights up with no redesign.
  const recurrence: string | null = null;
  return (
    <>
      <div style={{ position: "relative", minHeight: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "blur(64px)", background: "var(--bloom-plan)", opacity: 0.45 }} />
        <div style={{ position: "relative", zIndex: 1, padding: "46px 24px 24px", display: "flex", flexDirection: "column" }}>
          {onBack && (
            <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--aura-ink-45)", padding: 0, marginBottom: 14 }}>
              ← Home
            </button>
          )}
          <p className="aura-label" style={{ marginBottom: 8 }}>Your next plan</p>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.01em", margin: "0 0 10px" }}>
            {cap(plan.activityType)}
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--aura-ink-55)", margin: "0 0 18px" }}>
            {plan.place.name} · {plan.place.neighborhood} · {when}
          </p>

          {/* attendees summary */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: recurrence ? 8 : 18 }}>
            <div style={{ display: "flex" }}>
              {stack.map((a, i) => (
                <span key={a.userId} style={{ marginLeft: i === 0 ? 0 : -9, borderRadius: "9999px", border: "2px solid var(--aura-bg)", display: "inline-flex" }}>
                  <Swatch id={a.userId} name={a.displayName} size={32} />
                </span>
              ))}
            </div>
            <span style={{ fontSize: 12.5, color: "var(--aura-ink-55)" }}>You + {plan.attendees.length}</span>
          </div>
          {recurrence && (
            <p style={{ fontSize: 12.5, color: "var(--aura-plum)", fontWeight: 600, margin: "0 0 18px" }}>{recurrence}</p>
          )}

          {/* why this plan */}
          <div style={{ background: "var(--aura-violet-12)", borderRadius: 16, padding: 15, marginBottom: 20 }}>
            <div className="aura-label" style={{ color: "var(--ora-magenta)", marginBottom: 7 }}>Why this plan</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.5, color: "var(--aura-ink-90)", margin: 0 }}>
              {plan.whyThisPlan}
            </p>
          </div>

          {/* who's coming (per-person detail, tap to expand) */}
          <div className="aura-label" style={{ marginBottom: 10 }}>Who&apos;s coming</div>
          {plan.attendees.map((a) => (
            <PersonIntro key={a.userId} a={a} />
          ))}
        </div>
      </div>
      <div style={{ position: "sticky", bottom: 0, zIndex: 30 }}>
        <div style={{ padding: "26px 24px 20px", background: "linear-gradient(to top, var(--aura-bg) 55%, transparent)", display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onAccept} className="btn-soft btn-soft--ink">I&apos;m in</button>
          {onBack && (
            <button onClick={onBack} className="btn-soft btn-soft--ghost">Ask Ora to change</button>
          )}
        </div>
      </div>
    </>
  );
}

function AcceptedView({ plan, onBack, onDone, onCancel }: { plan: PlanResponse; onBack: () => void; onDone?: () => void; onCancel?: () => void }) {
  const when = formatWhen(plan.dateTime);
  const [phone, setPhone] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sending, setSending] = useState(false);
  const stack = plan.attendees.slice(0, 4);

  // Save the phone + send the plan details (email now, SMS when a provider is
  // wired), then finish. Best-effort: the UI proceeds even if delivery fails.
  const finish = async () => {
    setSending(true);
    try {
      await fetch("/api/plan/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone,
          details: {
            activityType: plan.activityType,
            placeName: plan.place.name,
            neighborhood: plan.place.neighborhood,
            address: plan.place.address,
            when,
            groupSize: plan.attendees.length,
          },
        }),
      });
    } catch {
      // ignore; proceed regardless
    }
    setSending(false);
    onDone?.();
  };

  return (
    <div style={{ position: "relative", minHeight: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden", display: "flex", flexDirection: "column", padding: "46px 24px 24px" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "blur(64px)", background: "var(--bloom-welcome)", opacity: 0.45 }} />

      <button onClick={onBack} style={{ position: "relative", alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, color: "var(--aura-ink-45)", marginBottom: 16 }}>
        ← My plan
      </button>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, marginBottom: 20 }}>
        <CheckSeal size={38} />
        <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.01em", margin: "6px 0 0" }}>You&apos;re in.</h1>
        <p style={{ fontSize: 14, color: "var(--aura-ink-55)", margin: 0, lineHeight: 1.5 }}>Your spot is saved. Ora will send you where and when.</p>
      </div>

      {/* plan recap */}
      <div style={{ position: "relative", background: "#fffdf7", border: "1px solid var(--aura-ink-10)", borderRadius: 16, padding: 15, marginBottom: 20 }}>
        <p style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 18, margin: "0 0 4px" }}>{cap(plan.activityType)}</p>
        <p style={{ fontSize: 12, color: "var(--aura-ink-55)", margin: "0 0 12px" }}>
          {plan.place.name} · {plan.place.neighborhood} · {when}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ display: "flex" }}>
            {stack.map((a, i) => (
              <span key={a.userId} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: 9999, border: "2px solid #fffdf7", display: "inline-flex" }}>
                <Swatch id={a.userId} name={a.displayName} size={28} />
              </span>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--aura-ink-55)" }}>You + {plan.attendees.length}</span>
        </div>
      </div>

      {/* phone + email collection — Ora sends the details (no group chat yet) */}
      <div style={{ position: "relative", flex: 1 }}>
        <p className="aura-label" style={{ marginBottom: 8 }}>Where should Ora send it?</p>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your phone number"
          style={{ width: "100%", font: "inherit", fontSize: 15, padding: "13px 15px", borderRadius: 14, border: "1px solid var(--aura-ink-10)", background: "#fffdf7", color: "var(--aura-ink)", outline: "none", boxSizing: "border-box" }}
        />
        <p style={{ fontSize: 12, color: "var(--aura-ink-55)", margin: "9px 0 0", lineHeight: 1.5 }}>
          We&apos;ll text and email you the plan, the details, and any changes.
        </p>
        <p style={{ fontSize: 12, color: "var(--aura-ink-45)", margin: "10px 0 0", lineHeight: 1.5 }}>
          Your number stays private. Ora sends the details, the group never sees it.
        </p>
      </div>

      <button onClick={finish} disabled={sending} className="btn-soft btn-soft--ink" style={{ position: "relative", marginTop: 16 }}>{sending ? "Sending" : "Done"}</button>

      {onCancel && (
        <div style={{ position: "relative", marginTop: 14, display: "flex", justifyContent: "center" }}>
          {confirmingCancel ? (
            <div style={{ width: "100%", display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmingCancel(false)} disabled={cancelling} className="btn-soft" style={{ flex: 1, background: "none", border: "1px solid var(--aura-ink-10)", color: "var(--aura-ink)" }}>
                Keep it
              </button>
              <button
                onClick={() => {
                  setCancelling(true);
                  onCancel();
                }}
                disabled={cancelling}
                className="btn-soft"
                style={{ flex: 1, background: "none", border: "1px solid var(--aura-ink-10)", color: "var(--aura-ink-55)" }}
              >
                {cancelling ? "Cancelling" : "Yes, cancel"}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmingCancel(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--aura-ink-45)" }}>
              Cancel this plan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Checkout ── pay for the plan (the guaranteed thing), with the 5-plan
// journey as the process-framed upsell. Matches the Warm Aurora mockup. Payment
// is stubbed for now (no Stripe yet); Continue confirms the spot.
function CheckoutView({ plan, onContinue, onBack }: { plan: PlanResponse; onContinue: () => void; onBack: () => void }) {
  const when = formatWhen(plan.dateTime);
  const [busy, setBusy] = useState(false);

  // Start a Stripe Checkout session; if payment isn't configured yet the route
  // replies { skipped: true } and we just proceed (payment is the last switch).
  const proceed = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "single" }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // ignore; fall through to proceed without payment
    }
    setBusy(false);
    onContinue();
  };
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column", padding: "46px 24px 24px" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-plan)", opacity: 0.4, filter: "blur(72px)", pointerEvents: "none" }} />
      <button onClick={onBack} style={{ position: "relative", alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--aura-ink-45)", padding: 0, marginBottom: 14 }}>←</button>
      <p className="aura-label" style={{ position: "relative", marginBottom: 12 }}>Confirm your spot</p>

      <div style={{ position: "relative", display: "flex", gap: 12, alignItems: "center", marginBottom: 18, background: "#fffdf7", border: "1px solid var(--aura-ink-10)", borderRadius: 16, padding: 14 }}>
        <Ring size={40} state="rest" />
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{cap(plan.activityType)}</p>
          <p style={{ fontSize: 11.5, color: "var(--aura-ink-55)", margin: "2px 0 0" }}>{when} · You + {plan.attendees.length}</p>
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
        <div style={{ border: "1.5px solid var(--aura-ink-10)", borderRadius: 16, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>This plan</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>$18</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--aura-ink-55)", margin: "3px 0 0" }}>Just this one. No commitment.</p>
        </div>
        <div style={{ border: "1.5px solid var(--aura-plum)", borderRadius: 16, padding: 14, background: "var(--aura-violet-12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--aura-plum)" }}>The 5-plan journey</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--aura-plum)" }}>$70</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--aura-ink-70)", margin: "3px 0 0" }}>Ora keeps bringing back the people you click with. Save $20.</p>
        </div>
      </div>

      <button onClick={proceed} disabled={busy} className="btn-soft btn-soft--ink" style={{ position: "relative", marginTop: 14 }}>{busy ? "One moment" : "Continue"}</button>
      <p style={{ position: "relative", fontSize: 11, textAlign: "center", color: "var(--aura-ink-55)", margin: "10px 0 0", lineHeight: 1.5 }}>
        Every plan is a great night, or we make it right. Your number stays private.
      </p>
    </div>
  );
}

export function LivePlanCard({
  plan,
  status = "ready",
  onAccepted,
  onDone,
  onBack,
  onCancel,
}: {
  plan: PlanResponse;
  status?: PlanStatus;
  onAccepted?: () => void;
  onDone?: () => void;
  onBack?: () => void;
  onCancel?: () => void;
}) {
  // Flow: plan card → checkout → confirmed. A plan the user already joined
  // (persisted status) opens straight to the accepted view.
  const alreadyJoined = status === "confirmed";
  const [step, setStep] = useState<"card" | "checkout" | "accepted">(alreadyJoined ? "accepted" : "card");

  if (step === "accepted")
    return (
      <AcceptedView
        plan={plan}
        onBack={alreadyJoined ? onBack ?? (() => {}) : () => setStep("card")}
        onDone={onDone}
        onCancel={onCancel}
      />
    );
  if (step === "checkout")
    return (
      <CheckoutView
        plan={plan}
        onBack={() => setStep("card")}
        onContinue={() => {
          setStep("accepted");
          onAccepted?.();
        }}
      />
    );
  return <CardView plan={plan} onAccept={() => setStep("checkout")} onBack={onBack} />;
}
