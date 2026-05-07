import Link from "next/link";
import { AuroraRing } from "@/components/AuroraRing";

export default function WelcomePage() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-ora-bg text-ora-light">
      {/* Atmospheric aurora bloom drifting in the background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, #A237FF 0%, transparent 60%), radial-gradient(50% 50% at 70% 70%, #FF3D9A 0%, transparent 70%), radial-gradient(40% 40% at 20% 60%, #5B2EFF 0%, transparent 70%)",
        }}
      />

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={120} state="idle" />

        <h1 className="font-display mt-10 text-5xl font-medium tracking-tight sm:text-6xl md:text-7xl">
          aura
        </h1>

        <p className="mt-5 max-w-md text-base font-light text-ora-light/70 sm:text-lg">
          Your people are out there. Let&apos;s find them.
        </p>

        <Link
          href="/voice"
          className="mt-12 inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-ora-light transition hover:bg-ora-violet active:scale-[0.98]"
        >
          Begin
        </Link>
      </div>

      <span className="pointer-events-none absolute bottom-6 right-6 text-xs text-ora-light/50">
        by Ora
      </span>
    </main>
  );
}
