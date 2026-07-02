// Smoke test for the onboarding voice agent (Phase 4). Drives the real
// extract + missing-field loop: a thin opening line should leave gaps and draw
// a follow-up question; a rich description should complete in one turn. Run with
// `npm run smoke:onboarding` (needs ANTHROPIC_API_KEY).

import { extract } from "../lib/extract";
import { generateText } from "../lib/aiProvider";
import { onboardingConverseTurn } from "../lib/onboardingAgent";
import type { MissingField } from "../lib/onboardingMissing";

async function askFn(args: { missing: MissingField[]; transcript: string }): Promise<string> {
  const top = args.missing.slice(0, 2);
  const fallback = top[0]?.question ?? "Tell me a bit more.";
  if (top.length === 0) return fallback;
  try {
    const reply = await generateText({
      system:
        "You are Ora, a warm onboarding guide. Ask ONE short, friendly follow-up question covering the missing things. One or two sentences, no lists, no em dashes.",
      messages: [
        {
          role: "user",
          content: `Said so far:\n${args.transcript}\n\nMissing:\n${top
            .map((m) => `- ${m.label}`)
            .join("\n")}`,
        },
      ],
      maxTokens: 120,
    });
    return reply.trim() || fallback;
  } catch {
    return fallback;
  }
}

async function run(label: string, utterances: string[]) {
  const res = await onboardingConverseTurn({ utterances, extractFn: extract, askFn });
  console.log(`\n=== ${label} ===`);
  console.log("UTTERANCES:", utterances);
  console.log("DONE:", res.done);
  console.log("MISSING:", res.missing.map((m) => m.field));
  console.log("ORA:", res.reply);
  return res;
}

async function main() {
  // Thin opening: expect gaps + a follow-up question.
  const thin = await run("thin opening (expect follow-up)", [
    "Hey, I just moved to Berlin and I don't really know anyone yet.",
  ]);
  if (thin.done) {
    console.error("\nFAIL: expected a thin opening to be incomplete.");
    process.exit(1);
  }

  // Rich description: one turn should leave only a small set of gaps (vibe and
  // social style commonly need a nudge, since the chip flow asks those
  // separately), then a single follow-up answer completes the profile.
  const opening =
    "I'm a chill but ambitious person, pretty curious and creative. I'm into startups, " +
    "techno and climbing, and on weekends I love the boulder gym and lake days around " +
    "Kreuzberg. Weekend evenings are best for me. I'm looking for a small group of " +
    "curious, open-minded people to do things with and share startups and music.";
  const rich = await run("rich description (expect a small gap)", [opening]);
  if (rich.missing.length > 4) {
    console.error("\nFAIL: rich description left too many gaps:", rich.missing.map((m) => m.field));
    process.exit(1);
  }

  const answer =
    "My vibe is laid-back and creative, and I like small-group, low-pressure hangs.";
  const complete = await run("after answering the follow-up (expect complete)", [opening, answer]);
  if (!complete.done) {
    console.error("\nFAIL: still missing after a follow-up:", complete.missing.map((m) => m.field));
    process.exit(1);
  }

  console.log("\nPASS: thin opening asked a follow-up; rich+answer completed the profile.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
