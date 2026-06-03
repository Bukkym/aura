"use client";

import { CSSProperties, ReactNode } from "react";
import { AuroraRing, RingState } from "@/components/AuroraRing";
import { PEOPLE, mono } from "./data";

// ── Aurora ring (live, breathes). Thin wrapper over AuroraRing, prototype default 44. ──
export function Ring({
  size = 44,
  state = "idle",
  style,
}: {
  size?: number;
  state?: RingState;
  // `dark` is accepted by the prototype call sites but has no visual effect; the
  // ring reads the same on cream and on the localized Ora bloom. Kept for parity.
  dark?: boolean;
  style?: CSSProperties;
}) {
  return <AuroraRing size={size} state={state} style={style} />;
}

// ── Procedural hue + initial. One soft tint per person (same lightness + chroma,
//    hue is the only variable) so a row of people reads calm, not clashing. ──
export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const AVATAR_HUES = [300, 350, 268, 327, 32, 12]; // violet, pink, indigo, mauve, peach, coral
export function auraHue(id: string): number {
  const i = PEOPLE.findIndex((p) => p.id === id);
  return AVATAR_HUES[(i >= 0 ? i : hashStr(String(id))) % AVATAR_HUES.length];
}
export function auraInitial(id: string, name?: string): string {
  const person = PEOPLE.find((p) => p.id === id);
  const label = String(name || (person && person.name) || id).trim();
  return label ? label[0].toUpperCase() : "?";
}

// ── Monogram avatar disc (replaces profile photos). ──
export function Swatch({ id, name, size = 32 }: { id: string; name?: string; size?: number }) {
  const hue = auraHue(id);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "none",
        background: `oklch(0.93 0.045 ${hue})`,
        color: `oklch(0.52 0.13 ${hue})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: Math.round(size * 0.46),
        lineHeight: 1,
        userSelect: "none",
        boxShadow: "inset 0 0 0 1px rgba(26,21,48,0.06)",
      }}
    >
      {auraInitial(id, name)}
    </div>
  );
}

// ── The "I" disc for the viewing user. ──
export function YouDisc({ size = 26 }: { size?: number }) {
  return (
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
        flex: "none",
      }}
    >
      I
    </span>
  );
}

// ── A row of overlapping monograms (You + N). ──
export function Stack({
  guests,
  you = true,
  size = 26,
  ring = "var(--aura-bg)",
}: {
  guests: string[];
  you?: boolean;
  size?: number;
  ring?: string;
}) {
  const items = (you ? ["you"] : []).concat(guests);
  return (
    <div style={{ display: "flex" }}>
      {items.map((id, i) => (
        <span
          key={id + i}
          style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: "50%", border: `2px solid ${ring}` }}
        >
          {id === "you" ? <YouDisc size={size} /> : <Swatch id={id} size={size} />}
        </span>
      ))}
    </div>
  );
}

// ── Aurora wordmark (lowercase, gradient). ──
export function Wordmark({ size = 60 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 500,
        fontSize: size,
        letterSpacing: "-0.02em",
        background: "linear-gradient(102deg, #7752E6, #A237FF 42%, #FF5C9C 86%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      aura
    </span>
  );
}

// ── Localized Ora bloom: a contained pool of aurora light behind the ring. Not a flip. ──
export function OraBloom({ show }: { show: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        opacity: show ? 1 : 0,
        transition: "opacity 600ms ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "38%",
          width: 460,
          height: 460,
          transform: "translate(-50%,-50%)",
          background:
            "radial-gradient(38% 38% at 50% 42%, rgba(162,55,255,0.55), transparent 70%), radial-gradient(44% 44% at 42% 50%, rgba(255,61,154,0.34), transparent 72%), radial-gradient(48% 48% at 60% 56%, rgba(91,46,255,0.46), transparent 74%)",
          filter: "blur(46px)",
        }}
      />
    </div>
  );
}

// ── Vibe / meta pill — a non-interactive fourth chip treatment (atmosphere). ──
export function Vibe({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--aura-ink-55)",
        background: "var(--aura-ink-06)",
        height: 30,
        padding: "0 13px",
        borderRadius: 9999,
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="aura-label" style={style}>
      {children}
    </div>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <span
      style={{
        marginLeft: "auto",
        color: "var(--aura-ink-40)",
        fontSize: 20,
        lineHeight: 1,
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform 240ms var(--ease-out)",
      }}
    >
      ›
    </span>
  );
}

// ── Icons ──
export function Cal({ s = 15, c = "var(--aura-ink-55)" }: { s?: number; c?: string }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 16 16"
      fill="none"
      stroke={c}
      strokeWidth="1.4"
      strokeLinecap="round"
      style={{ flex: "none" }}
    >
      <rect x="2" y="3.2" width="12" height="11" rx="2.4" />
      <path d="M2.4 6.6h11.2" />
      <path d="M5.4 1.8v2.6M10.6 1.8v2.6" />
    </svg>
  );
}

export function Mic({ s = 18 }: { s?: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function Pin({ s = 13, c = "var(--aura-ink-55)" }: { s?: number; c?: string }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 16 16"
      fill="none"
      stroke={c}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
    >
      <path d="M8 14s5-4.2 5-8A5 5 0 0 0 3 6c0 3.8 5 8 5 8z" />
      <circle cx="8" cy="6" r="1.7" />
    </svg>
  );
}

// Check seal for confirmed, clock for awaiting.
export function StatusIcon({ status, size = 16 }: { status: "confirmed" | "awaiting"; size?: number }) {
  if (status === "confirmed") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flex: "none" }}>
        <circle cx="8" cy="8" r="7.2" fill="oklch(0.64 0.13 150)" />
        <path d="M4.7 8.3l2.1 2.1 4.4-4.7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flex: "none" }}>
      <circle cx="8" cy="8" r="6.4" stroke="oklch(0.68 0.09 70)" strokeWidth="1.3" />
      <path d="M8 4.5V8l2.3 1.4" stroke="oklch(0.6 0.1 70)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatusTag({ status }: { status: "confirmed" | "awaiting" }) {
  const confirmed = status === "confirmed";
  const text = confirmed ? "oklch(0.48 0.08 150)" : "oklch(0.5 0.07 70)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        whiteSpace: "nowrap",
        fontFamily: "var(--font-body)",
        fontSize: 12.5,
        fontWeight: 500,
        color: text,
      }}
    >
      <StatusIcon status={status} size={15} />
      {confirmed ? "Confirmed" : "Awaiting reply"}
    </span>
  );
}

// Small check seal (confirmed) for Plans tab.
export function Seal({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flex: "none" }}>
      <circle cx="8" cy="8" r="7.2" fill="oklch(0.64 0.13 150)" />
      <path d="M4.7 8.3l2.1 2.1 4.4-4.7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckSeal({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flex: "none" }}>
      <circle cx="12" cy="12" r="11" fill="oklch(0.64 0.13 150)" />
      <path d="M7 12.3l3.2 3.2L17 8.4" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WhatsApp({ size = 18, c = "#fff" }: { size?: number; c?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={c} style={{ flex: "none" }}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.97L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.8c2.17 0 4.2.85 5.74 2.38a8.06 8.06 0 0 1 2.38 5.73c0 4.48-3.65 8.12-8.13 8.12a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.24-4.28c0-4.48 3.65-8.13 8.13-8.13zm4.5 10.27c-.06-.1-.22-.16-.46-.28-.24-.12-1.45-.72-1.67-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.72-.65-1.21-1.45-1.35-1.69-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42l-.47-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2.01s.86 2.33.98 2.49c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.57.18 1.1.16 1.51.1.46-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16z" />
    </svg>
  );
}

// ── Per-person soft tint chip (shared-interest pills). ──
export function tintChip(hue: number): CSSProperties {
  return {
    fontFamily: "var(--font-body)",
    fontSize: 13,
    fontWeight: 500,
    color: `oklch(0.46 0.12 ${hue})`,
    background: `oklch(0.95 0.045 ${hue})`,
    padding: "5px 11px",
    borderRadius: 9999,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1.1,
  };
}

export { mono };
