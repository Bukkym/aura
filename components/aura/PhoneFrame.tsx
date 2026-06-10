"use client";

import { ReactNode, useEffect, useRef } from "react";

// The mobile column every aura flow screen lives in. Centers a ~402px column
// (every screen is designed at that width) on a dark backdrop, with a single
// hidden-scrollbar scroll container. Resets scroll + replays the entrance fade
// whenever screenKey changes, matching the prototype's screen-state router.
export function PhoneFrame({
  children,
  screenKey,
  overlay,
  footer,
}: {
  children: ReactNode;
  screenKey: string;
  // Pinned to the column (above the scroll content), e.g. a sign-out control.
  overlay?: ReactNode;
  // Pinned to the very bottom edge of the column, non-interactive (e.g. a small
  // date/observability badge). Doesn't block taps on content below it.
  footer?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [screenKey]);
  return (
    <main style={{ minHeight: "100dvh", width: "100%", display: "flex", justifyContent: "center", background: "#14101f" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 430,
          height: "100dvh",
          background: "var(--aura-bg)",
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(0,0,0,0.25)",
        }}
      >
        <div ref={scroller} className="aura-flow-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden" }}>
          <div key={screenKey} style={{ height: "100%", animation: "flowFade 360ms ease both" }}>
            {children}
          </div>
        </div>
        {overlay}
        {footer && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 45, pointerEvents: "none" }}>
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
