import type { Plan, User } from "@/types";
import { generateText } from "./aiProvider";
import { topShared, firstName } from "./whyTemplates";
import type { StretchAngle } from "./stretchPlan";

// Module 4 M4.2: an LLM-narrated "why this plan" that warms up the deterministic
// template. It runs on the SAME shared-signal payload lib/whyTemplates.ts uses,
// and falls through to that template (already computed as plan.whyThisPlan) on
// any error or timeout. So generatePlan stays fully deterministic and AI-free;
// this is a best-effort upgrade layered in the route, like lib/embed.embedProfile.
//
// The pure parts (prompt build, output sanitization) are unit-tested; the LLM
// call is injected so the timeout/fallback logic is testable without a network.

export const WHY_SYSTEM = `You write the one-sentence "why this plan" line for Aura, a social app that introduces someone to a small compatible group and a place to meet in Berlin.

Rules:
- One warm, natural sentence, about 25 words, plain language.
- Use ONLY the facts given. Never invent names, places, interests, or numbers.
- A match is a suggestion, not a certainty: say Ora "leaned on" or "paired around" a shared thread, not that people definitely click.
- No quotes around the sentence. No em dashes. No lists.`;

export interface NarrateDeps {
  /** Injected for tests; defaults to the real Claude call. */
  generate?: typeof generateText;
  /** Fall back to the template if the call hasn't returned in this many ms. */
  timeoutMs?: number;
  /** Optional model override (e.g. a faster model for this high-volume turn). */
  model?: string;
}

/** Build the user prompt from the plan's real shared signals + the baseline. */
export function buildWhyPrompt(plan: Plan, requester: User): string {
  const members = [requester, ...plan.attendees];
  const sharedInterest = topShared(members, (u) => u.selfExtracted.interests);
  const sharedVibe = topShared(members, (u) => u.selfExtracted.vibeKeywords);
  const names = plan.attendees.slice(0, 4).map((a) => firstName(a.displayName));

  const facts = [
    `Activity: ${plan.activityType}`,
    `Venue: ${plan.place.name}${plan.place.neighborhood ? ` in ${plan.place.neighborhood}` : ""}`,
    `Group: ${firstName(requester.displayName)} plus ${names.length > 0 ? names.join(", ") : "a few others"}`,
    sharedInterest ? `Shared interest: ${sharedInterest}` : "",
    sharedVibe ? `Shared vibe: ${sharedVibe}` : "",
    `Baseline sentence: ${plan.whyThisPlan}`,
  ].filter(Boolean);

  return `Facts:\n${facts.join("\n")}\n\nRewrite the baseline as one warmer, more natural sentence, using only the facts above.`;
}

/**
 * Clean an LLM line into card-ready copy, or return the fallback if unusable.
 * maxLen guards against a rambling model; it varies by surface (the one-line
 * "why" is tight, the multi-sentence stretch note gets more room).
 */
export function sanitizeNarration(
  raw: string | null | undefined,
  fallback: string,
  maxLen = 320,
): string {
  if (!raw) return fallback;
  let s = raw.trim();
  s = s.replace(/^["'“”]+|["'“”]+$/g, "").trim(); // strip wrapping quotes
  s = s.replace(/\s*[—–]\s*/g, ", "); // project rule: no em/en dashes
  s = s.replace(/\s+/g, " ").trim(); // collapse newlines/whitespace
  if (s.length === 0) return fallback;
  if (s.length > maxLen) return fallback; // model rambled; trust the template
  return s;
}

// ── Stretch narration (M4.5) ────────────────────────────────────────────────

export const STRETCH_SYSTEM = `You are Ora, writing a short, warm note for Aura that offers someone a plan which gently stretches past their usual comfort zone in Berlin.

Strict honesty rules:
- Base this ONLY on what the person TOLD you (their stated preference, e.g. they like small groups). You have NOT watched their behavior; never claim you noticed, learned, or saw anything about how they act.
- Frame it as a suggestion, not a fact: "Ora thinks", "might", "could". Never assert they will like it.
- Two or three warm sentences. Acknowledge their stated preference, then offer the bigger plan and why it might fit, using only the facts given.
- No quotes around the note. No em dashes. No lists.`;

/** Build the stretch prompt from the angle + plan facts. Pure, testable. */
export function buildStretchPrompt(
  plan: Plan,
  requester: User,
  angle: StretchAngle,
): string {
  const sharedInterest = topShared(
    [requester, ...plan.attendees],
    (u) => u.selfExtracted.interests,
  );
  const facts = [
    `Their stated preference: ${angle.reason}`,
    `What this plan stretches: ${angle.usualLabel} -> ${angle.thisLabel}`,
    `Activity: ${plan.activityType}`,
    `Venue: ${plan.place.name}${plan.place.neighborhood ? ` in ${plan.place.neighborhood}` : ""}`,
    `Seats at the table: ${angle.k + 1}`,
    sharedInterest ? `A shared interest in the group: ${sharedInterest}` : "",
    `Name to address: ${firstName(requester.displayName)}`,
  ].filter(Boolean);

  return `Facts:\n${facts.join("\n")}\n\nWrite the stretch note now, following the rules.`;
}

/**
 * LLM-narrated stretch note, or the deterministic `fallback` on any error or
 * timeout. Never throws. Mirrors narrateWhy's best-effort contract.
 */
export async function narrateStretch(
  plan: Plan,
  requester: User,
  angle: StretchAngle,
  fallback: string,
  deps: NarrateDeps = {},
): Promise<string> {
  const generate = deps.generate ?? generateText;
  const timeoutMs = deps.timeoutMs ?? 1500;
  try {
    const raw = await withTimeout(
      generate({
        system: STRETCH_SYSTEM,
        messages: [{ role: "user", content: buildStretchPrompt(plan, requester, angle) }],
        maxTokens: 220,
        model: deps.model,
      }),
      timeoutMs,
    );
    // The stretch note is intentionally 2-3 sentences, so allow more room than
    // the one-line "why" before deciding the model rambled.
    return sanitizeNarration(raw, fallback, 500);
  } catch {
    return fallback;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("narration timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Return an LLM-narrated "why this plan", or plan.whyThisPlan (the deterministic
 * template) on any error/timeout/empty/over-long output. Never throws.
 */
export async function narrateWhy(
  plan: Plan,
  requester: User,
  deps: NarrateDeps = {},
): Promise<string> {
  const generate = deps.generate ?? generateText;
  const timeoutMs = deps.timeoutMs ?? 1500;
  const fallback = plan.whyThisPlan;
  try {
    const raw = await withTimeout(
      generate({
        system: WHY_SYSTEM,
        messages: [{ role: "user", content: buildWhyPrompt(plan, requester) }],
        maxTokens: 200,
        model: deps.model,
      }),
      timeoutMs,
    );
    return sanitizeNarration(raw, fallback);
  } catch {
    return fallback;
  }
}
