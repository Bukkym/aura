"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhoneFrame } from "@/components/aura/PhoneFrame";
import { Ring, Wordmark } from "@/components/aura/primitives";

// Clears the client-side draft and returns to the start. On error, stops and
// shows what went wrong instead of bouncing.
export function DemoResetClient({ error }: { error?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (error) return;
    try {
      // The draft moved to localStorage (survives the magic-link new tab);
      // the sessionStorage remove covers drafts written before that change.
      localStorage.removeItem("aura:draft");
      sessionStorage.removeItem("aura:draft");
      sessionStorage.removeItem("aura:plan");
      sessionStorage.removeItem("aura:planStatus");
    } catch {
      // ignore
    }
    const t = setTimeout(() => router.replace("/"), 700);
    return () => clearTimeout(t);
  }, [error, router]);

  return (
    <PhoneFrame screenKey={error ? "reset-error" : "reset"}>
      <div
        style={{
          position: "relative",
          height: "100%",
          background: "var(--aura-bg)",
          color: "var(--aura-ink)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          textAlign: "center",
        }}
      >
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--bloom-welcome)", opacity: 0.5, filter: "blur(64px)" }} />
        <div style={{ position: "relative" }}>
          <Ring size={96} state={error ? "idle" : "processing"} />
          <div style={{ marginTop: 24 }}>
            <Wordmark size={40} />
          </div>
          {error ? (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 24, letterSpacing: "-0.01em", margin: "18px 0 6px" }}>Couldn&apos;t reset.</h1>
              <p style={{ fontSize: 14, color: "var(--aura-ink-70)", margin: "0 auto", maxWidth: 280, lineHeight: 1.5 }}>{error}</p>
              <Link href="/" className="btn btn--ghost" style={{ marginTop: 24, display: "inline-flex", color: "var(--aura-violet)", textDecoration: "none" }}>
                ← back to start
              </Link>
            </>
          ) : (
            <p style={{ marginTop: 18, fontSize: 15, color: "var(--aura-ink-70)" }}>Starting fresh…</p>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}
