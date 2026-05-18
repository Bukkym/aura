"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuroraRing } from "@/components/AuroraRing";
import type {
  ConnectionType,
  LookingForExtracted,
  SelfExtracted,
} from "@/types";

// Screen 4 from /product/01-ui-flow.md: "Here's what I heard." Editable
// chip review of the extracted profile, with a "Find my people" CTA that
// hands off to /plan (which holds the just-in-time auth gate).
//
// Profile source today: hardcoded stub matching lib/extract.ts. When real
// extraction lands in Slice C, /voice will write the extraction result to
// sessionStorage under "aura:draft" and this screen will read from there
// on mount. The submit handler always writes to sessionStorage so /plan
// can pick it up after the auth bounce.

const STORAGE_KEY = "aura:draft";

interface DraftProfile {
  selfExtracted: SelfExtracted;
  lookingForExtracted: LookingForExtracted;
}

const INITIAL_SELF: SelfExtracted = {
  personality: ["chill", "ambitious", "curious"],
  interests: ["startups", "philosophy"],
  activityTypes: ["boulder gym", "weekend hikes"],
  socialPreferences: ["small-group", "low-pressure"],
  lifeContext: ["new to Berlin", "remote worker"],
  vibeKeywords: [],
};

const INITIAL_LOOKING_FOR: LookingForExtracted = {
  personality: ["chill", "ambitious"],
  interests: ["startups"],
  socialPreferences: ["low-pressure"],
  vibeKeywords: [],
  connectionType: ["activity-buddies", "close-friendships"],
};

const SELF_CATEGORIES: Array<{
  key: keyof Pick<
    SelfExtracted,
    | "personality"
    | "interests"
    | "activityTypes"
    | "socialPreferences"
    | "lifeContext"
  >;
  label: string;
}> = [
  { key: "personality", label: "Personality" },
  { key: "interests", label: "What you're into" },
  { key: "activityTypes", label: "What you like doing" },
  { key: "socialPreferences", label: "How you socialize" },
  { key: "lifeContext", label: "Where you're at" },
];

const LOOKING_FOR_CATEGORIES: Array<{
  key: keyof Pick<
    LookingForExtracted,
    "personality" | "interests" | "socialPreferences"
  >;
  label: string;
}> = [
  { key: "personality", label: "Personality" },
  { key: "interests", label: "Into" },
  { key: "socialPreferences", label: "Vibe" },
];

// Closed set, rendered as multi-select pills per the spec.
const CONNECTION_TYPES: Array<{ value: ConnectionType; label: string }> = [
  { value: "close-friendships", label: "deep connections" },
  { value: "social-circle", label: "a friend group" },
  { value: "activity-buddies", label: "people to do things with" },
  { value: "new-city-support", label: "help finding my footing here" },
];

export default function ChipsPage() {
  const router = useRouter();
  const [self, setSelf] = useState<SelfExtracted>(INITIAL_SELF);
  const [lookingFor, setLookingFor] = useState<LookingForExtracted>(
    INITIAL_LOOKING_FOR,
  );

  // Hydrate from sessionStorage if /voice put a draft there (post-Slice-C).
  // Until then this is a no-op and the hardcoded stub is what shows.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<DraftProfile>;
      if (parsed.selfExtracted) setSelf(parsed.selfExtracted);
      if (parsed.lookingForExtracted)
        setLookingFor(parsed.lookingForExtracted);
    } catch {
      // Bad JSON, ignore — keep stub.
    }
  }, []);

  function removeSelfTag(category: (typeof SELF_CATEGORIES)[number]["key"], tag: string) {
    setSelf((prev) => ({
      ...prev,
      [category]: prev[category].filter((t) => t !== tag),
    }));
  }

  function removeLookingForTag(
    category: (typeof LOOKING_FOR_CATEGORIES)[number]["key"],
    tag: string,
  ) {
    setLookingFor((prev) => ({
      ...prev,
      [category]: prev[category].filter((t) => t !== tag),
    }));
  }

  function toggleConnectionType(ct: ConnectionType) {
    setLookingFor((prev) => {
      const active = prev.connectionType.includes(ct);
      return {
        ...prev,
        connectionType: active
          ? prev.connectionType.filter((c) => c !== ct)
          : [...prev.connectionType, ct],
      };
    });
  }

  // Minimum coverage: at least one interest, one activity, and one connection
  // type. Disables the CTA per the spec's edge-case rule.
  const canSubmit =
    self.interests.length > 0 &&
    self.activityTypes.length > 0 &&
    lookingFor.connectionType.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selfExtracted: self,
          lookingForExtracted: lookingFor,
        }),
      );
    } catch {
      // sessionStorage can fail in private-mode Safari, etc. /plan will
      // re-prompt the user if it can't find a draft.
    }
    router.push("/plan");
  }

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-aura-bg text-aura-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 25% 20%, rgba(255, 123, 172, 0.28) 0%, transparent 65%), radial-gradient(45% 45% at 80% 30%, rgba(201, 125, 255, 0.22) 0%, transparent 70%), radial-gradient(40% 40% at 60% 90%, rgba(119, 82, 230, 0.18) 0%, transparent 70%)",
        }}
      />

      <Link
        href="/voice"
        className="absolute left-5 top-5 text-sm text-aura-ink/50 transition hover:text-aura-ink"
      >
        ← back
      </Link>

      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <AuroraRing size={48} state="idle" />
          <h1 className="font-display mt-6 text-3xl font-medium tracking-tight text-aura-ink sm:text-4xl">
            Here&apos;s what I heard.
          </h1>
          <p className="mt-3 text-sm text-aura-ink/60">
            Tap anything that&apos;s not quite right.
          </p>
        </div>

        <section className="mt-12">
          <SectionLabel>YOU</SectionLabel>
          <div className="mt-5 space-y-5">
            {SELF_CATEGORIES.map(({ key, label }) => {
              const tags = self[key];
              if (tags.length === 0) return null;
              return (
                <CategoryRow key={key} label={label}>
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onRemove={() => removeSelfTag(key, tag)}
                    />
                  ))}
                </CategoryRow>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <SectionLabel>THE PEOPLE YOU&apos;RE LOOKING FOR</SectionLabel>
          <div className="mt-5 space-y-5">
            {LOOKING_FOR_CATEGORIES.map(({ key, label }) => {
              const tags = lookingFor[key];
              if (tags.length === 0) return null;
              return (
                <CategoryRow key={key} label={label}>
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onRemove={() => removeLookingForTag(key, tag)}
                    />
                  ))}
                </CategoryRow>
              );
            })}

            <CategoryRow label="What kind of connection">
              {CONNECTION_TYPES.map((ct) => (
                <ConnectionPill
                  key={ct.value}
                  label={ct.label}
                  active={lookingFor.connectionType.includes(ct.value)}
                  onToggle={() => toggleConnectionType(ct.value)}
                />
              ))}
            </CategoryRow>
          </div>
        </section>

        <div className="mt-16 flex flex-col items-center gap-3 pb-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex h-12 items-center justify-center rounded-full bg-aura-violet px-8 text-base font-medium text-aura-bg transition hover:bg-ora-violet active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-aura-ink/15 disabled:text-aura-ink/40 disabled:hover:bg-aura-ink/15"
          >
            Find my people →
          </button>
          {!canSubmit && (
            <p className="text-xs text-aura-ink/50">
              {self.interests.length === 0
                ? "Add at least one thing you're into."
                : self.activityTypes.length === 0
                  ? "Add at least one thing you like doing."
                  : "Pick at least one kind of connection."}
            </p>
          )}
        </div>
      </div>

      <span className="pointer-events-none absolute bottom-6 right-6 text-xs text-aura-ink/40">
        by Ora
      </span>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-aura-ink/45">
      {children}
    </h2>
  );
}

function CategoryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-aura-ink/50">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label}`}
      className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-aura-lavender/60 px-4 text-sm text-aura-violet transition hover:border-aura-violet hover:bg-aura-violet/5 active:scale-[0.97]"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-xs text-aura-violet/0 transition group-hover:text-aura-violet"
      >
        ×
      </span>
    </button>
  );
}

function ConnectionPill({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={
        active
          ? "inline-flex h-9 items-center rounded-full bg-aura-violet px-4 text-sm font-medium text-aura-bg transition active:scale-[0.97]"
          : "inline-flex h-9 items-center rounded-full border border-aura-lavender/60 px-4 text-sm text-aura-violet transition hover:border-aura-violet hover:bg-aura-violet/5 active:scale-[0.97]"
      }
    >
      {label}
    </button>
  );
}
