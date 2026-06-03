import { CSSProperties } from "react";

export type RingState = "idle" | "recording" | "processing" | "rest";

interface AuroraRingProps {
  size?: number;
  state?: RingState;
  className?: string;
  style?: CSSProperties;
}

// The brand mark + Ora's presence. A live, breathing ring (never a static SVG in
// product UI): conic aurora gradient + radial mask cutting the center hole + a
// blurred halo copy behind. Animation is driven by data-state via .aura-ring CSS
// in globals.css. Halo blur scales with size (18% of diameter).
export function AuroraRing({
  size = 120,
  state = "idle",
  className = "",
  style,
}: AuroraRingProps) {
  return (
    <div
      className={`aura-ring ${className}`.trim()}
      data-state={state}
      style={{ ["--ring-size" as string]: `${size}px`, width: size, height: size, ...style }}
    >
      <div className="aura-ring__halo" />
      <div className="aura-ring__band" />
    </div>
  );
}
