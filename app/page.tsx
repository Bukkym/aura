import Link from "next/link";
import { AuroraRing } from "@/components/AuroraRing";

export default function WelcomePage() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      {/* Soft aurora bloom on cream — peach + lavender + violet, low opacity, drifting. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 25% 20%, rgba(255, 123, 172, 0.28) 0%, transparent 65%), radial-gradient(45% 45% at 80% 30%, rgba(201, 125, 255, 0.22) 0%, transparent 70%), radial-gradient(40% 40% at 60% 90%, rgba(119, 82, 230, 0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={120} state="idle" />

        <h1 className="font-display mt-10 text-5xl font-medium tracking-tight text-aura-ink sm:text-6xl md:text-7xl">
          aura
        </h1>

        <p className="mt-5 max-w-md text-base font-light text-aura-ink/70 sm:text-lg">
          Your people are out there. Let&apos;s find them.
        </p>

        <Link
          href="/voice"
          className="mt-12 inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-aura-bg transition hover:bg-ora-violet active:scale-[0.98]"
        >
          Begin
        </Link>
      </div>

      <span className="pointer-events-none absolute bottom-6 right-6 text-xs text-aura-ink/40">
        by Ora
      </span>
    </main>
  );
}
