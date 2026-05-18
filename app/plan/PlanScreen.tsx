"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuroraRing } from "@/components/AuroraRing";
import { AuraSwatch } from "@/components/AuraSwatch";
import type {
  LookingForExtracted,
  SelfExtracted,
} from "@/types";
import type { AttendeeView, PlanResponse } from "../api/plan/create/route";

// Screen 5: the Plan card. This Client Component handles the
// "Finding your first Plan..." Ora moment, the fetch, and the card render.
//
// Flow:
//   1. On mount, read aura:draft from sessionStorage (set by /chips).
//   2. If absent, show a friendly nudge to start at /voice.
//   3. If present, POST to /api/plan/create — this triggers the Ora moment.
//   4. On success, render the Plan card.
//
// Refinement controls (inline refinement chips + free-form text) and the
// "Why these six?" dev panel are deferred to Slice D.

const STORAGE_KEY = "aura:draft";

interface Draft {
  selfExtracted: SelfExtracted;
  lookingForExtracted: LookingForExtracted;
}

type Phase =
  | { kind: "loading" }
  | { kind: "no-draft" }
  | { kind: "generating" }
  | { kind: "error"; message: string }
  | { kind: "ready"; plan: PlanResponse };

export function PlanScreen() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let draft: Draft | null = null;
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) draft = JSON.parse(raw) as Draft;
      } catch {
        // ignore, treat as no draft
      }
      if (!draft) {
        if (!cancelled) setPhase({ kind: "no-draft" });
        return;
      }

      if (!cancelled) setPhase({ kind: "generating" });
      try {
        const res = await fetch("/api/plan/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(
            detail?.error ?? `Request failed: ${res.status}`,
          );
        }
        const { plan } = (await res.json()) as { plan: PlanResponse };
        if (!cancelled) setPhase({ kind: "ready", plan });
      } catch (err) {
        if (!cancelled) {
          setPhase({
            kind: "error",
            message: err instanceof Error ? err.message : "Something went wrong",
          });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "loading" || phase.kind === "generating") {
    return <OraMoment />;
  }
  if (phase.kind === "no-draft") {
    return <NoDraft />;
  }
  if (phase.kind === "error") {
    return <ErrorState message={phase.message} />;
  }
  return <PlanCard plan={phase.plan} />;
}

// ----------------------------------------------------------------------------
// Loading / Ora moment
// ----------------------------------------------------------------------------

function OraMoment() {
  // Pure luminous bloom on cream — see app/voice/page.tsx for the reasoning.
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(45% 45% at 25% 25%, rgba(255, 123, 172, 0.22) 0%, transparent 70%), radial-gradient(40% 40% at 75% 75%, rgba(201, 125, 255, 0.18) 0%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-fade-in"
        style={{
          background: `
            radial-gradient(circle at 50% 42%, rgba(162, 55, 255, 0.50) 0%, transparent 18%),
            radial-gradient(circle at 50% 42%, rgba(255, 61, 154, 0.35) 0%, transparent 30%),
            radial-gradient(circle at 50% 42%, rgba(201, 125, 255, 0.22) 0%, transparent 50%)
          `,
        }}
      />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={200} state="processing" />
        <p className="mt-12 text-base text-aura-ink/55">
          Finding your first Plan...
        </p>
      </div>
    </main>
  );
}

// ----------------------------------------------------------------------------
// Edge states
// ----------------------------------------------------------------------------

function NoDraft() {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={96} state="idle" />
        <h1 className="font-display mt-8 text-3xl font-medium tracking-tight">
          Let&apos;s start with you.
        </h1>
        <p className="mt-3 max-w-sm text-sm text-aura-ink/60">
          Tell me a bit about yourself first, then I&apos;ll find your people.
        </p>
        <Link
          href="/voice"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-aura-bg transition hover:bg-ora-violet"
        >
          Begin
        </Link>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <AuroraRing size={96} state="idle" />
        <h1 className="font-display mt-8 text-3xl font-medium tracking-tight">
          Something didn&apos;t land.
        </h1>
        <p className="mt-3 max-w-sm text-sm text-aura-ink/60">{message}</p>
        <Link
          href="/chips"
          className="mt-10 text-sm text-aura-ink/55 underline-offset-4 transition hover:text-aura-ink hover:underline"
        >
          ← back to chips
        </Link>
      </div>
    </main>
  );
}

// ----------------------------------------------------------------------------
// Plan card
// ----------------------------------------------------------------------------

function PlanCard({ plan }: { plan: PlanResponse }) {
  const when = new Date(plan.dateTime);
  const dayLine = when.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Berlin",
  });
  const timeLine = when.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(45% 45% at 20% 10%, rgba(255, 123, 172, 0.22) 0%, transparent 70%), radial-gradient(40% 40% at 80% 90%, rgba(201, 125, 255, 0.18) 0%, transparent 75%)",
        }}
      />

      <Link
        href="/chips"
        className="absolute left-5 top-5 z-10 text-sm text-aura-ink/50 transition hover:text-aura-ink"
      >
        ← back
      </Link>

      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Your first Plan.
          </h1>
        </div>

        <article className="mt-10 rounded-3xl border border-aura-ink/10 bg-aura-bg/60 p-7 shadow-[0_8px_40px_-20px_rgba(26,21,48,0.25)] backdrop-blur-sm">
          {/* Activity headline */}
          <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-aura-ink sm:text-3xl">
            {plan.activityType}
          </h2>

          <div className="mt-3 text-base text-aura-ink/70">
            <p>
              {plan.place.name}{" "}
              <span className="text-aura-ink/45">· {plan.place.neighborhood}</span>
            </p>
            <p className="mt-0.5">
              {dayLine} <span className="text-aura-ink/45">·</span> {timeLine}
            </p>
          </div>

          <Divider />

          <p className="text-sm leading-relaxed text-aura-ink/80">
            {plan.whyThisPlan}
          </p>

          <Divider />

          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-aura-ink/45">
            THE PEOPLE
          </h3>
          <ul className="mt-4 space-y-1">
            {plan.attendees.map((a) => (
              <AttendeeRow key={a.userId} attendee={a} />
            ))}
          </ul>
        </article>

      </div>

      <span className="pointer-events-none absolute bottom-6 right-6 text-xs text-aura-ink/40">
        by Ora
      </span>
    </main>
  );
}

function Divider() {
  return <hr className="my-6 border-aura-ink/10" />;
}

function AttendeeRow({ attendee }: { attendee: AttendeeView }) {
  const [expanded, setExpanded] = useState(false);
  const summary = attendeeOneLiner(attendee);
  const hasDetails =
    attendee.explanation.sharedInterests.length > 0 ||
    attendee.explanation.sharedActivityTypes.length > 0 ||
    attendee.explanation.sharedSocialPreferences.length > 0 ||
    attendee.explanation.sharedLifeContext.length > 0 ||
    attendee.explanation.matchedPersonalityTraits.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((v) => !v)}
        aria-expanded={expanded}
        disabled={!hasDetails}
        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-aura-ink/[0.03] disabled:cursor-default disabled:hover:bg-transparent"
      >
        <AuraSwatch seed={attendee.userId} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-base text-aura-ink">
            <span className="font-medium">{attendee.displayName}</span>
            {summary && (
              <span className="text-aura-ink/55"> · {summary}</span>
            )}
          </p>
        </div>
        {hasDetails && (
          <span
            aria-hidden
            className={`text-aura-ink/35 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            ⌄
          </span>
        )}
      </button>
      {expanded && (
        <div className="ml-11 mr-2 mt-1 mb-3 animate-fade-in space-y-1 rounded-xl bg-aura-ink/[0.025] px-4 py-3 text-sm text-aura-ink/70">
          {attendee.explanation.sharedInterests.length > 0 && (
            <Detail
              label="Both into"
              values={attendee.explanation.sharedInterests}
            />
          )}
          {attendee.explanation.sharedActivityTypes.length > 0 && (
            <Detail
              label="Also do"
              values={attendee.explanation.sharedActivityTypes}
            />
          )}
          {attendee.explanation.matchedPersonalityTraits.length > 0 && (
            <Detail
              label="The energy you described"
              values={attendee.explanation.matchedPersonalityTraits}
            />
          )}
          {attendee.explanation.sharedSocialPreferences.length > 0 && (
            <Detail
              label="Social style"
              values={attendee.explanation.sharedSocialPreferences}
            />
          )}
          {attendee.explanation.sharedLifeContext.length > 0 && (
            <Detail
              label="Where you both are"
              values={attendee.explanation.sharedLifeContext}
            />
          )}
        </div>
      )}
    </li>
  );
}

function Detail({ label, values }: { label: string; values: string[] }) {
  return (
    <p>
      <span className="text-aura-ink/45">{label}:</span>{" "}
      <span className="text-aura-ink/80">{values.join(", ")}</span>
    </p>
  );
}

// One-line summary per the spec: "also climbs · into startups". Pulls from
// the precomputed overlap explanation; falls back to interests if no overlap.
function attendeeOneLiner(a: AttendeeView): string {
  const bits: string[] = [];
  if (a.explanation.sharedActivityTypes.length > 0) {
    bits.push(`also ${a.explanation.sharedActivityTypes[0]}`);
  }
  if (a.explanation.sharedInterests.length > 0) {
    bits.push(`into ${a.explanation.sharedInterests[0]}`);
  }
  if (bits.length === 0 && a.selfExtracted.interests.length > 0) {
    bits.push(`into ${a.selfExtracted.interests[0]}`);
  }
  return bits.slice(0, 2).join(" · ");
}
