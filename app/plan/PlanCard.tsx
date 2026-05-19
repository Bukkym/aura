"use client";

import { useState } from "react";
import Link from "next/link";
import { AuraSwatch } from "@/components/AuraSwatch";
import type { AttendeeView, PlanResponse } from "../api/plan/create/route";

// Plan card render. Extracted from PlanScreen so /plan-demo can render
// the same UI server-side without going through the fetch flow.
//
// Client Component because AttendeeRow uses useState for the tap-to-expand
// detail panel. Refinement controls + "Why these six?" panel are Slice D.

export function PlanCard({
  plan,
  backHref = "/chips",
}: {
  plan: PlanResponse;
  backHref?: string;
}) {
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
        href={backHref}
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
            <Detail label="Both into" values={attendee.explanation.sharedInterests} />
          )}
          {attendee.explanation.sharedActivityTypes.length > 0 && (
            <Detail label="Also do" values={attendee.explanation.sharedActivityTypes} />
          )}
          {attendee.explanation.matchedPersonalityTraits.length > 0 && (
            <Detail label="The energy you described" values={attendee.explanation.matchedPersonalityTraits} />
          )}
          {attendee.explanation.sharedSocialPreferences.length > 0 && (
            <Detail label="Social style" values={attendee.explanation.sharedSocialPreferences} />
          )}
          {attendee.explanation.sharedLifeContext.length > 0 && (
            <Detail label="Where you both are" values={attendee.explanation.sharedLifeContext} />
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
