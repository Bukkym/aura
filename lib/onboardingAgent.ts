import type { LookingForExtracted, SelfExtracted } from "@/types";
import {
  isProfileComplete,
  missingRequiredFields,
  type ExtractedProfile,
  type MissingField,
} from "./onboardingMissing";

// One turn of the onboarding voice agent. The user speaks; we re-extract the
// WHOLE conversation so far (corrections included), check what required chips
// are still missing, and either ask one warm follow-up or hand off a complete
// draft to the chip flow.
//
// extractFn and askFn are injected so the loop is unit/smoke-testable without a
// network. In the route they are lib/extract.ts and a Claude call; here the
// orchestration (when to stop asking, what to ask about) is what we test.

export interface OnboardingDraft {
  selfExtracted: SelfExtracted;
  lookingForExtracted: LookingForExtracted;
}

export interface OnboardingTurnResult {
  /** True when the profile meets the chip-flow minimums, or we've asked enough. */
  done: boolean;
  /** What Ora says next: a follow-up question, or a short confirmation. */
  reply: string;
  /** The draft so far, ready to prefill the chips. */
  draft: OnboardingDraft;
  /** Remaining gaps (empty when done because the profile is complete). */
  missing: MissingField[];
}

const CONFIRMATION =
  "Got it. I've put together a starting picture of you, have a quick look and tweak anything that's off.";

/**
 * Run one onboarding turn over the accumulated utterances.
 *
 * Stops asking (done = true) when the profile is complete OR we've already
 * collected more than `maxAsk` follow-up answers: the prefilled chip flow is
 * the safety net that enforces any remaining minimums, so we never trap the
 * user in an endless question loop.
 */
export async function onboardingConverseTurn(opts: {
  utterances: string[];
  extractFn: (text: string) => Promise<ExtractedProfile>;
  askFn: (args: { missing: MissingField[]; transcript: string }) => Promise<string>;
  maxAsk?: number;
}): Promise<OnboardingTurnResult> {
  const utterances = opts.utterances.filter((u) => u && u.trim().length > 0);
  const transcript = utterances.join("\n");
  const maxAsk = opts.maxAsk ?? 2;

  const extracted = await opts.extractFn(transcript);
  const draft: OnboardingDraft = {
    selfExtracted: extracted.self,
    lookingForExtracted: extracted.lookingFor,
  };

  const missing = missingRequiredFields(extracted);

  // The first utterance is the opening description; each later one is a
  // follow-up answer. Stop once we've already taken maxAsk answers.
  const answersTaken = Math.max(0, utterances.length - 1);
  const askedEnough = answersTaken >= maxAsk;

  if (isProfileComplete(extracted) || askedEnough) {
    return { done: true, reply: CONFIRMATION, missing, draft };
  }

  const reply = await opts.askFn({ missing, transcript });
  return { done: false, reply, missing, draft };
}
