"use client";

// Live in-app shell: Home + Plans tab wired to the real PlanResponse. Same
// visual language as the prototype's app-shell/plans-tab, but data-driven and
// without the sample-data Plans history or stretch moment (those stay in /flow,
// Module 4). Reuses BottomBar, plus OraAskLive: the Ask Ora sheet wired to the
// real agent at /api/ora/chat (the prototype's mock OraAsk stays in /flow).

import { useState } from "react";
import { Ring, Swatch, Cal, StatusIcon, mono } from "../primitives";
import { BottomBar } from "./bottom-bar";
import { OraAskLive } from "./ora-ask-live";
import { RequestAnotherSheet } from "./request-another";
import type { PlanResponse } from "@/app/api/plan/create/route";
import type { PlanStatus, PlanSummary } from "@/types";

// The Ready/Confirmed cards render from a small shared shape so both the live
// current plan (PlanResponse, on Home) and persisted history (PlanSummary, in
// the Plans tab) can drive them.
interface CardPlan {
  activityType: string;
  place: { name: string; neighborhood: string };
  dateTime: string;
  attendeeCount: number;
  attendees: { userId: string; displayName: string }[];
}

function cardFromResponse(p: PlanResponse): CardPlan {
  return {
    activityType: p.activityType,
    place: { name: p.place.name, neighborhood: p.place.neighborhood },
    dateTime: p.dateTime,
    attendeeCount: p.attendees.length,
    attendees: p.attendees.map((a) => ({ userId: a.userId, displayName: a.displayName })),
  };
}

function cardFromSummary(s: PlanSummary): CardPlan {
  return {
    activityType: s.activityType,
    place: { name: s.place.name, neighborhood: s.place.neighborhood },
    dateTime: s.dateTime,
    attendeeCount: s.attendeeCount,
    attendees: s.attendees,
  };
}

function headerWhen(iso: string): { big: string; sub: string } {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "Europe/Berlin" });
  const hour = Number(d.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" }));
  const daypart = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return { big: `${weekday} ${daypart}`, sub: "Berlin" };
}

function shortWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "Europe/Berlin" });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Europe/Berlin" })
    .replace(" ", "")
    .toLowerCase();
  return `${day} · ${time}`;
}

function YouDisc({ size = 26, ring = "var(--aura-bg)" }: { size?: number; ring?: string }) {
  return (
    <span style={{ marginLeft: 0, borderRadius: "50%", border: `2px solid ${ring}` }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--aura-violet)",
          color: "#FAF7F2",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: Math.round(size * 0.46),
        }}
      >
        I
      </span>
    </span>
  );
}

function AttendeeStack({ plan, ring = "var(--aura-bg)", size = 26 }: { plan: CardPlan; ring?: string; size?: number }) {
  const few = plan.attendees.slice(0, 3);
  return (
    <div style={{ display: "flex" }}>
      <YouDisc size={size} ring={ring} />
      {few.map((a) => (
        <span key={a.userId} style={{ marginLeft: -8, borderRadius: "50%", border: `2px solid ${ring}` }}>
          <Swatch id={a.userId} name={a.displayName} size={size} />
        </span>
      ))}
    </div>
  );
}

function ReadyCard({ plan, onOpen }: { plan: CardPlan; onOpen?: () => void }) {
  return (
    <div
      role="button"
      onClick={onOpen}
      style={{
        cursor: "pointer",
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
        <img src="/otto-ambience.png" alt={plan.place.name} style={{ display: "block", width: "100%", height: 150, objectFit: "cover" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(22,13,34,0.82), rgba(22,13,34,0.05) 65%)" }} />
        <span style={{ position: "absolute", top: 13, left: 14, fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#1A1530", background: "rgba(250,247,242,0.94)", padding: "5px 10px", borderRadius: 9999, fontWeight: 600 }}>
          ★ New · ready to review
        </span>
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 13 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: "#FAF7F2", letterSpacing: "0.01em", lineHeight: 1.1, textTransform: "uppercase" }}>{plan.activityType}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "rgba(250,247,242,0.9)" }}>
            {plan.place.name} · {plan.place.neighborhood}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 500, color: "var(--aura-ink-90)" }}>
          <Cal c="var(--aura-violet)" />
          {shortWhen(plan.dateTime)}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--aura-violet)", fontWeight: 500 }}>
          {plan.attendeeCount} people <span style={{ fontSize: 16 }}>→</span>
        </span>
      </div>
    </div>
  );
}

function ConfirmedCard({ plan, onOpen }: { plan: CardPlan; onOpen?: () => void }) {
  return (
    <div
      role="button"
      onClick={onOpen}
      style={{ cursor: "pointer", borderRadius: 22, padding: "18px 18px", border: "1px solid oklch(0.88 0.05 285)", background: "oklch(0.975 0.02 285)", animation: "flowFade 500ms ease both" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.48 0.09 285)" }}>
          <StatusIcon status="confirmed" size={14} /> You&apos;re going
        </span>
        <span style={{ fontSize: 12.5, color: "var(--aura-ink-45)" }}>{shortWhen(plan.dateTime)}</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "0.01em", lineHeight: 1.1, textTransform: "uppercase" }}>{plan.activityType}</div>
      <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 4 }}>
        {plan.place.name} · {plan.place.neighborhood}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <AttendeeStack plan={plan} ring="oklch(0.975 0.02 285)" />
        <span style={{ fontSize: 13, color: "var(--aura-violet)", fontWeight: 500 }}>View invite →</span>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.02em", background: "linear-gradient(102deg, #7752E6, #FF5C9C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>aura</span>
  );
}

export function LiveHome({
  plan,
  status,
  onOpenPlan,
  onPlans,
}: {
  plan: PlanResponse;
  status: PlanStatus;
  onOpenPlan: () => void;
  onPlans: () => void;
}) {
  const [ask, setAsk] = useState(false);
  const when = headerWhen(plan.dateTime);
  const card = cardFromResponse(plan);
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.4, filter: "blur(70px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "56px 22px 12px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 25, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{when.big}</div>
          <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 2 }}>
            {when.sub} · {plan.place.neighborhood}
          </div>
        </div>
        <Wordmark />
      </div>

      <div style={{ position: "relative", flex: 1, overflowY: "auto", padding: "10px 22px 24px" }}>
        <div className="aura-label" style={{ marginBottom: 12 }}>
          {status === "confirmed" ? "Upcoming" : "Your Plan"}
        </div>
        {status === "confirmed" ? <ConfirmedCard plan={card} onOpen={onOpenPlan} /> : <ReadyCard plan={card} onOpen={onOpenPlan} />}

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

      <BottomBar active="home" onHome={() => {}} onAsk={() => setAsk(true)} onPlans={onPlans} />
      <OraAskLive open={ask} onClose={() => setAsk(false)} />
    </div>
  );
}

// ── Stretch moment (M4.5) ────────────────────────────────────────────────────
// Ora offers ONE plan that gently stretches the user's stated comfort zone (a
// bigger, more communal table for a small-group person). Honest by design: the
// copy is built from what the user TOLD Ora, framed as a suggestion. Rendered as
// a distinct aurora-bordered teaser at the top of the Plans tab.

export interface LiveStretch {
  plan: PlanResponse;
  usualLabel: string;
  thisLabel: string;
}

function StretchTeaser({ stretch, onResolved }: { stretch: LiveStretch; onResolved?: () => void }) {
  const [state, setState] = useState<"idle" | "busy" | "confirmed" | "dismissed">("idle");
  const card = cardFromResponse(stretch.plan);

  if (state === "dismissed") return null;

  const act = async (path: string, next: "confirmed" | "dismissed") => {
    setState("busy");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: stretch.plan.planId }),
      });
      if (!res.ok) throw new Error("request failed");
      setState(next);
      onResolved?.();
    } catch {
      setState("idle"); // let them try again
    }
  };

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        padding: 2,
        marginBottom: 18,
        background: "linear-gradient(120deg, #7752E6, #FF5C9C)",
        boxShadow: "0 12px 34px rgba(120,50,170,0.22)",
        animation: "flowFade 600ms ease both",
      }}
    >
      <div style={{ borderRadius: 20, background: "var(--aura-bg)", padding: "18px 18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ring size={22} state="rest" />
          <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--aura-violet)", fontWeight: 600 }}>
            A nudge from Ora
          </span>
        </div>

        {state === "confirmed" ? (
          <p style={{ margin: "4px 0", fontSize: 14.5, color: "var(--aura-ink-90)", lineHeight: 1.5 }}>
            You&apos;re in. It&apos;s waiting in your Plans.
          </p>
        ) : (
          <>
            <p style={{ margin: "0 0 14px", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 16.5, lineHeight: 1.4, color: "var(--aura-ink)" }}>
              {stretch.plan.whyThisPlan}
            </p>

            {/* usual -> this contrast */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ flex: 1, fontSize: 12, color: "var(--aura-ink-55)", lineHeight: 1.35 }}>
                <span className="aura-label" style={{ display: "block", marginBottom: 3 }}>Your usual</span>
                {stretch.usualLabel}
              </span>
              <span style={{ color: "var(--aura-violet)", fontSize: 16 }}>→</span>
              <span style={{ flex: 1, fontSize: 12, color: "var(--aura-ink-90)", lineHeight: 1.35, fontWeight: 500 }}>
                <span className="aura-label" style={{ display: "block", marginBottom: 3, color: "var(--aura-violet)" }}>This one</span>
                {stretch.thisLabel}
              </span>
            </div>

            {/* compact plan facts */}
            <div style={{ borderTop: "1px solid var(--aura-ink-10)", paddingTop: 12 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "0.01em", textTransform: "uppercase" }}>
                {card.activityType}
              </div>
              <div style={{ fontSize: 13, color: "var(--aura-ink-55)", marginTop: 3 }}>
                {card.place.name} · {card.place.neighborhood} · {shortWhen(card.dateTime)}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <AttendeeStack plan={card} />
                <span style={{ fontSize: 13, color: "var(--aura-violet)", fontWeight: 500 }}>{card.attendeeCount} people</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => act("/api/plan/confirm", "confirmed")}
                disabled={state === "busy"}
                className="btn btn--aurora"
                style={{ flex: 1, opacity: state === "busy" ? 0.6 : 1 }}
              >
                I&apos;m in
              </button>
              <button
                onClick={() => act("/api/plan/decline", "dismissed")}
                disabled={state === "busy"}
                className="btn"
                style={{ flex: "none", background: "transparent", color: "var(--aura-ink-55)", border: "1px solid var(--aura-ink-10)" }}
              >
                Not this one
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ summary, onOpen }: { summary: PlanSummary; onOpen?: () => void }) {
  const card = cardFromSummary(summary);
  return summary.status === "confirmed" ? (
    <ConfirmedCard plan={card} onOpen={onOpen} />
  ) : (
    <ReadyCard plan={card} onOpen={onOpen} />
  );
}

// The Plans tab is DB-backed history: upcoming plans (the freshly created one
// included, since it's persisted on create) and past plans. The current plan's
// full card lives behind /home's warm cache, so the upcoming card taps through
// to /plan; past plans render as summary cards (per-plan rehydration is a
// follow-up).
export function LivePlansTab({
  upcoming,
  past,
  onHome,
  onOpenPlan,
  currentAttendees = [],
  onRefined,
  stretch,
}: {
  upcoming: PlanSummary[];
  past: PlanSummary[];
  onHome: () => void;
  onOpenPlan: () => void;
  currentAttendees?: { userId: string; displayName: string }[];
  onRefined?: (plan: PlanResponse) => void;
  /** Ora's stretch offer (M4.5), shown as a teaser above the list. */
  stretch?: LiveStretch | null;
}) {
  const [ask, setAsk] = useState(false);
  const [refine, setRefine] = useState(false);
  const comingCount = upcoming.length;
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-plan)", opacity: 0.34, filter: "blur(72px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "56px 22px 12px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 25, letterSpacing: "-0.01em" }}>Your Plans</div>
          <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 2 }}>
            Berlin · {comingCount} coming up
          </div>
        </div>
        <Wordmark />
      </div>

      <div style={{ position: "relative", flex: 1, overflowY: "auto", padding: "8px 22px 26px" }}>
        {stretch && <StretchTeaser stretch={stretch} />}

        <div className="aura-label" style={{ marginBottom: 12 }}>
          Coming up
        </div>
        {comingCount > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {upcoming.map((s) => (
              <SummaryCard key={s.id} summary={s} onOpen={onOpenPlan} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "16px 16px", borderRadius: 18, border: "1px dashed var(--aura-ink-10)" }}>
            <Ring size={26} state="rest" />
            <p style={{ margin: 0, fontSize: 14, color: "var(--aura-ink-55)", lineHeight: 1.45 }}>No Plan in front of you right now. Ora is lining up your next one.</p>
          </div>
        )}

        <div className="aura-label" style={{ margin: "28px 0 12px" }}>
          Earlier
        </div>
        {past.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {past.map((s) => (
              <SummaryCard key={s.id} summary={s} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "16px 16px", borderRadius: 18, border: "1px dashed var(--aura-ink-10)" }}>
            <Ring size={26} state="rest" />
            <p style={{ margin: 0, fontSize: 14, color: "var(--aura-ink-55)", lineHeight: 1.45 }}>Your past Plans will gather here once you&apos;ve been to a few.</p>
          </div>
        )}

        {onRefined && (
          <button
            onClick={() => setRefine(true)}
            className="btn"
            style={{ width: "100%", marginTop: 22, background: "transparent", color: "var(--aura-violet)", border: "1px solid var(--aura-violet-30)", gap: 8 }}
          >
            Request another Plan →
          </button>
        )}

        <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--aura-ink-45)", lineHeight: 1.5 }}>
          Ora keeps one good Plan in front of you at a time. The rest stays out of the way.
        </p>
      </div>

      <BottomBar active="plans" onHome={onHome} onAsk={() => setAsk(true)} onPlans={() => {}} />
      <OraAskLive open={ask} onClose={() => setAsk(false)} />
      {onRefined && (
        <RequestAnotherSheet
          open={refine}
          onClose={() => setRefine(false)}
          attendees={currentAttendees}
          onRefined={(plan) => {
            setRefine(false);
            onRefined(plan);
          }}
        />
      )}
    </div>
  );
}
