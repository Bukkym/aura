"use client";

// Live in-app shell: Home + Plans tab wired to the real PlanResponse. Same
// visual language as the prototype's app-shell/plans-tab, but data-driven and
// without the sample-data Plans history or stretch moment (those stay in /flow,
// Module 4). Reuses BottomBar + OraAsk (both data-agnostic).

import { useState } from "react";
import { Ring, Swatch, Cal, StatusIcon, mono } from "../primitives";
import { BottomBar } from "./bottom-bar";
import { OraAsk } from "./app-shell";
import type { PlanResponse } from "@/app/api/plan/create/route";
import type { PlanStatus } from "../useLivePlan";

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

function AttendeeStack({ plan, ring = "var(--aura-bg)", size = 26 }: { plan: PlanResponse; ring?: string; size?: number }) {
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

function ReadyCard({ plan, onOpen }: { plan: PlanResponse; onOpen: () => void }) {
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
          {plan.attendees.length} people <span style={{ fontSize: 16 }}>→</span>
        </span>
      </div>
    </div>
  );
}

function ConfirmedCard({ plan, onOpen }: { plan: PlanResponse; onOpen: () => void }) {
  return (
    <div
      role="button"
      onClick={onOpen}
      style={{ cursor: "pointer", borderRadius: 22, padding: "18px 18px", border: "1px solid oklch(0.88 0.05 150)", background: "oklch(0.975 0.02 150)", animation: "flowFade 500ms ease both" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: mono, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(0.48 0.09 150)" }}>
          <StatusIcon status="confirmed" size={14} /> You&apos;re going
        </span>
        <span style={{ fontSize: 12.5, color: "var(--aura-ink-45)" }}>{shortWhen(plan.dateTime)}</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "0.01em", lineHeight: 1.1, textTransform: "uppercase" }}>{plan.activityType}</div>
      <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 4 }}>
        {plan.place.name} · {plan.place.neighborhood}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <AttendeeStack plan={plan} ring="oklch(0.975 0.02 150)" />
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
        {status === "confirmed" ? <ConfirmedCard plan={plan} onOpen={onOpenPlan} /> : <ReadyCard plan={plan} onOpen={onOpenPlan} />}

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
      <OraAsk open={ask} onClose={() => setAsk(false)} />
    </div>
  );
}

export function LivePlansTab({
  plan,
  status,
  onHome,
  onOpenPlan,
}: {
  plan: PlanResponse;
  status: PlanStatus;
  onHome: () => void;
  onOpenPlan: () => void;
}) {
  const [ask, setAsk] = useState(false);
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", display: "flex", flexDirection: "column" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-plan)", opacity: 0.34, filter: "blur(72px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "56px 22px 12px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 25, letterSpacing: "-0.01em" }}>Your Plans</div>
          <div style={{ fontSize: 13.5, color: "var(--aura-ink-55)", marginTop: 2 }}>Berlin · 1 coming up</div>
        </div>
        <Wordmark />
      </div>

      <div style={{ position: "relative", flex: 1, overflowY: "auto", padding: "8px 22px 26px" }}>
        <div className="aura-label" style={{ marginBottom: 12 }}>
          Coming up
        </div>
        {status === "confirmed" ? <ConfirmedCard plan={plan} onOpen={onOpenPlan} /> : <ReadyCard plan={plan} onOpen={onOpenPlan} />}

        <div className="aura-label" style={{ margin: "28px 0 12px" }}>
          Earlier
        </div>
        <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "16px 16px", borderRadius: 18, border: "1px dashed var(--aura-ink-10)" }}>
          <Ring size={26} state="rest" />
          <p style={{ margin: 0, fontSize: 14, color: "var(--aura-ink-55)", lineHeight: 1.45 }}>Your past Plans will gather here once you&apos;ve been to a few.</p>
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
