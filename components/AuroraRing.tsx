"use client";

import { CSSProperties } from "react";

export type RingState = "idle" | "recording" | "processing" | "rest";

interface AuroraRingProps {
  size?: number;
  state?: RingState;
  className?: string;
}

// Aurora gradient — flows around the ring. Order chosen for a smooth violet → magenta → coral cycle.
const auroraGradient =
  "conic-gradient(from 0deg, #5B2EFF, #A237FF, #FF3D9A, #FF7BAC, #C97DFF, #5B2EFF)";

export function AuroraRing({
  size = 120,
  state = "idle",
  className = "",
}: AuroraRingProps) {
  const haloAnimation =
    state === "processing"
      ? "animate-spin-slow"
      : state === "recording"
        ? "animate-pulse-slow"
        : state === "rest"
          ? ""
          : "animate-pulse-slow";

  const ringAnimation =
    state === "processing" ? "animate-spin-slow" : haloAnimation;

  const haloOpacity = state === "recording" ? 0.7 : state === "rest" ? 0.35 : 0.5;

  const haloStyle: CSSProperties = {
    background: auroraGradient,
    opacity: haloOpacity,
  };

  // Radial mask cuts a hole in the middle of a filled disc, leaving an aurora ring.
  const ringStyle: CSSProperties = {
    background: auroraGradient,
    WebkitMask: "radial-gradient(transparent 58%, black 62%)",
    mask: "radial-gradient(transparent 58%, black 62%)",
  };

  return (
    <div
      className={`relative no-select ${className}`}
      style={{ width: size, height: size }}
      data-state={state}
    >
      <div
        className={`absolute inset-0 rounded-full blur-2xl ${haloAnimation}`}
        style={haloStyle}
      />
      <div
        className={`absolute inset-0 rounded-full ${ringAnimation}`}
        style={ringStyle}
      />
    </div>
  );
}
