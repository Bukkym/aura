import type { Plan, User } from "@/types";
import { generateText } from "./aiProvider";
import { topShared, firstName } from "./whyTemplates";

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

/** Clean an LLM line into card-ready copy, or return the fallback if unusable. */
export function sanitizeNarration(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  let s = raw.trim();
  s = s.replace(/^["'“”]+|["'“”]+$/g, "").trim(); // strip wrapping quotes
  s = s.replace(/\s*[—–]\s*/g, ", "); // project rule: no em/en dashes
  s = s.replace(/\s+/g, " ").trim(); // collapse newlines/whitespace
  if (s.length === 0) return fallback;
  if (s.length > 320) return fallback; // model rambled; trust the template
  return s;
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
