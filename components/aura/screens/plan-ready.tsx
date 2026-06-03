"use client";

// aura — the accepted / "Plan is ready" handoff. Reached after the user taps
// "I'm in". A compressed Plan summary, the Ora-voiced invite the group receives,
// and the copy / WhatsApp CTAs. Stays on the cream surface.

import { useState } from "react";
import { Ring, Swatch, Cal, CheckSeal, WhatsApp, mono } from "../primitives";
import { PLAN, READY_ATTENDEES, DEFAULT_INVITE } from "../data";

export function MobilePlanReady({ onBack, onHome }: { onBack?: () => void; onHome?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState(DEFAULT_INVITE);
  const [editing, setEditing] = useState(false);

  const doCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1900);
  };

  return (
    <div style={{ position: "relative", minHeight: "100%", background: "var(--aura-bg)", color: "var(--aura-ink)", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "blur(64px)", background: "var(--bloom-welcome)", opacity: 0.5 }} />

      {/* top bar */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 20px 6px" }}>
        <button onClick={onBack} className="btn btn--back" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 14, color: "var(--aura-ink-45)" }}>
          ← My Plan
        </button>
        <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--aura-ink-40)" }}>Plan 001</span>
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "10px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* confirmation moment */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 22 }}>
          <CheckSeal size={40} />
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 27, letterSpacing: "-0.01em", margin: "14px 0 6px", whiteSpace: "nowrap" }}>You&apos;re in.</h1>
          <p className="aura-body" style={{ fontSize: 15, color: "var(--aura-ink-70)", margin: 0, maxWidth: 300, lineHeight: 1.45 }}>
            Ora is introducing you to the group. Here&apos;s what everyone gets.
          </p>
        </div>

        {/* compressed plan summary */}
        <div style={{ width: "100%", background: "var(--aura-bg)", border: "1px solid var(--aura-ink-10)", borderRadius: 20, boxShadow: "var(--shadow-card)", overflow: "hidden", marginBottom: 18 }}>
          <div style={{ position: "relative", height: 116 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/otto-ambience.png" alt="Otto Bar" style={{ display: "block", width: "100%", height: 116, objectFit: "cover" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(22,13,34,0.78), rgba(22,13,34,0.05) 70%)" }} />
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#FAF7F2", letterSpacing: "0.01em", lineHeight: 1.12 }}>{PLAN.activity}</div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: "rgba(250,247,242,0.9)" }}>
                {PLAN.venue} · {PLAN.hood}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Cal c="var(--aura-violet)" />
              <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--aura-ink-90)" }}>{PLAN.when}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex" }}>
                {["you"].concat(READY_ATTENDEES.slice(0, 4)).map((id, i) => (
                  <span key={id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: "50%", border: "2px solid var(--aura-bg)" }}>
                    {id === "you" ? (
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--aura-violet)",
                          color: "#FAF7F2",
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        I
                      </span>
                    ) : (
                      <Swatch id={id} size={24} />
                    )}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: "var(--aura-ink-55)", whiteSpace: "nowrap" }}>You + 6</span>
            </div>
          </div>
        </div>

        {/* invite preview */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span className="aura-label" style={{ whiteSpace: "nowrap" }}>
            The invite
          </span>
          <button
            onClick={() => setEditing(!editing)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--aura-violet)" }}
          >
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
              style={{
                width: "100%",
                border: "1px solid var(--aura-violet-30)",
                borderRadius: 12,
                padding: "10px 12px",
                resize: "none",
                fontFamily: "var(--font-body)",
                fontSize: 14.5,
                lineHeight: 1.5,
                color: "var(--aura-ink-90)",
                background: "var(--aura-bg)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.55, color: "var(--aura-ink-90)", margin: 0, whiteSpace: "pre-wrap" }}>{invite}</p>
          )}
        </div>

        {/* CTAs */}
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

        <p style={{ fontSize: 12.5, color: "var(--aura-ink-45)", textAlign: "center", margin: "16px 0 0", maxWidth: 280, lineHeight: 1.45 }}>
          Once two more say yes, Ora locks the table and sends everyone the details.
        </p>
        {onHome && (
          <button onClick={onHome} className="btn btn--ghost" style={{ marginTop: 14, color: "var(--aura-violet)" }}>
            Done, see it in my plans →
          </button>
        )}
      </div>
      <span className="by-ora" style={{ position: "absolute", bottom: 22, right: 20, color: "var(--aura-ink-40)" }}>
        by Ora
      </span>
    </div>
  );
}
