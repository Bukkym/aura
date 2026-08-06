"use client";

// Data-driven Plan card + accepted handoff for the live /plan route. Same
// pixel-faithful visuals as the prototype's MobilePlanA (postcard header) and
// MobilePlanReady, but fed by the real PlanResponse from /api/plan/create
// (deterministic matching, no AI). Ora's per-person aside is a light template
// over the strongest shared signal, not an LLM line.

import { useState } from "react";
import {
  Ring,
  Swatch,
  Cal,
  Pin,
  Vibe,
  CheckSeal,
  WhatsApp,
  auraHue,
  tintChip,
  mono,
} from "../primitives";
import type { AttendeeView, PlanResponse } from "@/app/api/plan/create/route";
import type { PlanStatus } from "@/types";

// ── helpers ──
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "Europe/Berlin" });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Europe/Berlin" })
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

// A light opener Ora suggests for the meeting itself. A real question to ask
// (structured self-disclosure) does more to turn a meet into a connection than
// logistics do; grounded in a shared interest when there is one.
function icebreaker(plan: PlanResponse): string {
  const interest = plan.attendees.flatMap((a) => a.explanation.sharedInterests ?? [])[0];
  return interest
    ? `What first pulled you toward ${interest}?`
    : `What's something you've been quietly into lately?`;
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
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [invite, setInvite] = useState(
    `Hey, Ora here. You've all been picked for a Plan because of how you click. ${cap(plan.activityType)} ${when.replace(" · ", ", ")}, ${plan.place.name}${plan.place.address ? `, ${plan.place.address}` : ` in ${plan.place.neighborhood}`}. No prep needed, just show up. See you there.`,
  );
  const doCopy = () => {
    try {
      navigator.clipboard?.writeText(invite);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1900);
  };
  const stack = plan.attendees.slice(0, 4);

  return (
    <div style={{ position: "relative", minHeight: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "blur(64px)", background: "var(--bloom-welcome)", opacity: 0.5 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 20px 6px" }}>
        <button onClick={onBack} className="btn btn--back" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, color: "var(--aura-ink-45)" }}>
          ← My Plan
        </button>
        <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--aura-ink-40)" }}>Plan</span>
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "10px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 22 }}>
          <CheckSeal size={40} />
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 27, letterSpacing: "-0.01em", margin: "14px 0 6px", whiteSpace: "nowrap" }}>You&apos;re in.</h1>
          <p className="aura-body" style={{ fontSize: 15, color: "var(--aura-ink-70)", margin: 0, maxWidth: 300, lineHeight: 1.45 }}>
            Ora is introducing you to the group. Here&apos;s what everyone gets.
          </p>
        </div>

        <div style={{ width: "100%", background: "var(--aura-bg)", border: "1px solid var(--aura-ink-10)", borderRadius: 20, boxShadow: "var(--shadow-card)", overflow: "hidden", marginBottom: 18 }}>
          <div style={{ position: "relative", height: 116 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/otto-ambience.png" alt={plan.place.name} style={{ display: "block", width: "100%", height: 116, objectFit: "cover" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(22,13,34,0.78), rgba(22,13,34,0.05) 70%)" }} />
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#FAF7F2", letterSpacing: "0.01em", lineHeight: 1.12, textTransform: "uppercase" }}>{plan.activityType}</div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: "rgba(250,247,242,0.9)" }}>
                {plan.place.name} · {plan.place.neighborhood}
              </div>
              {plan.place.address && (
                <div style={{ marginTop: 2, fontSize: 12, color: "rgba(250,247,242,0.8)" }}>
                  {plan.place.address}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Cal c="var(--aura-violet)" />
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--aura-ink-90)" }}>{when}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex" }}>
                <span style={{ borderRadius: "50%", border: "2px solid var(--aura-bg)" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--aura-violet)", color: "#FAF7F2", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11 }}>I</span>
                </span>
                {stack.map((a) => (
                  <span key={a.userId} style={{ marginLeft: -8, borderRadius: "50%", border: "2px solid var(--aura-bg)" }}>
                    <Swatch id={a.userId} name={a.displayName} size={24} />
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: "var(--aura-ink-55)", whiteSpace: "nowrap" }}>You + {plan.attendees.length}</span>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span className="aura-label" style={{ whiteSpace: "nowrap" }}>
            The invite
          </span>
          <button onClick={() => setEditing(!editing)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--aura-violet)" }}>
            {editing ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{ width: "100%", background: "oklch(0.97 0.012 300)", border: "1px solid var(--aura-ink-10)", borderRadius: 16, padding: "14px 15px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ring size={20} state="rest" />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 14 }}>Ora</span>
            <span style={{ fontSize: 12, color: "var(--aura-ink-45)" }}>to the group</span>
          </div>
          {editing ? (
            <textarea
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              rows={6}
              style={{ width: "100%", border: "1px solid var(--aura-violet-30)", borderRadius: 12, padding: "10px 12px", resize: "none", fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.5, color: "var(--aura-ink-90)", background: "var(--aura-bg)", outline: "none", boxSizing: "border-box" }}
            />
          ) : (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.55, color: "var(--aura-ink-90)", margin: 0, whiteSpace: "pre-wrap" }}>{invite}</p>
          )}
        </div>

        <div style={{ width: "100%", display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 18 }}>
          <span style={{ flex: "none", marginTop: 1 }}>
            <Ring size={15} state="rest" />
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--aura-ink-55)", lineHeight: 1.45 }}>
            To break the ice when you meet, try asking:{" "}
            <span style={{ fontStyle: "italic", color: "var(--aura-violet)" }}>&ldquo;{icebreaker(plan)}&rdquo;</span>
          </span>
        </div>

        <button className="btn btn--aurora" style={{ width: "100%", marginBottom: 10, gap: 9 }}>
          <WhatsApp size={18} /> Open WhatsApp
        </button>
        <button onClick={doCopy} className="btn" style={{ width: "100%", background: "transparent", color: "var(--aura-ink)", border: "1px solid var(--aura-violet-30)", gap: 8 }}>
          {copied ? (
            <>
              <CheckSeal size={16} /> Copied
            </>
          ) : (
            "Copy invite message"
          )}
        </button>

        <p style={{ fontSize: 12, color: "var(--aura-ink-45)", textAlign: "center", margin: "14px 0 0", maxWidth: 280, lineHeight: 1.45 }}>
          Your number stays private. Ora connects the group through an anonymous line, so no one sees anyone else&apos;s real number.
        </p>
        <p style={{ fontSize: 12.5, color: "var(--aura-ink-45)", textAlign: "center", margin: "8px 0 0", maxWidth: 280, lineHeight: 1.45 }}>
          Once two more say yes, Ora locks the table and sends everyone the details.
        </p>
        {onDone && (
          <button onClick={onDone} className="btn btn--ghost" style={{ marginTop: 14, color: "var(--aura-violet)" }}>
            Done, see it in my plans →
          </button>
        )}

        {onCancel && (
          <div style={{ width: "100%", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--aura-ink-10)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {confirmingCancel ? (
              <>
                <p style={{ fontSize: 13, color: "var(--aura-ink-55)", textAlign: "center", margin: "0 0 12px", maxWidth: 290, lineHeight: 1.45 }}>
                  Cancel this Plan? It leaves your list. If you already shared the invite, let the group know yourself.
                </p>
                <div style={{ display: "flex", gap: 10, width: "100%" }}>
                  <button
                    onClick={() => setConfirmingCancel(false)}
                    disabled={cancelling}
                    className="btn"
                    style={{ flex: 1, background: "transparent", color: "var(--aura-ink)", border: "1px solid var(--aura-violet-30)" }}
                  >
                    Keep it
                  </button>
                  <button
                    onClick={() => {
                      setCancelling(true);
                      onCancel();
                    }}
                    disabled={cancelling}
                    className="btn"
                    style={{ flex: 1, background: "transparent", color: "var(--aura-ink-55)", border: "1px solid var(--aura-ink-10)" }}
                  >
                    {cancelling ? "Cancelling" : "Yes, cancel"}
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setConfirmingCancel(true)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--aura-ink-45)" }}
              >
                Cancel this Plan
              </button>
            )}
          </div>
        )}
      </div>
      <span className="by-ora" style={{ position: "absolute", bottom: 22, right: 20, color: "var(--aura-ink-40)" }}>
        by Ora
      </span>
    </div>
  );
}

// ── Checkout ── pay for the plan (the guaranteed thing), with the 5-plan
// journey as the process-framed upsell. Matches the Warm Aurora mockup. Payment
// is stubbed for now (no Stripe yet); Continue confirms the spot.
function CheckoutView({ plan, onContinue, onBack }: { plan: PlanResponse; onContinue: () => void; onBack: () => void }) {
  const when = formatWhen(plan.dateTime);
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

      <button onClick={onContinue} className="btn-soft btn-soft--ink" style={{ position: "relative", marginTop: 14 }}>Continue</button>
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
