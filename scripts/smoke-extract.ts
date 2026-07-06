// Smoke test for the real extraction pass (Phase 3). Sends a free-text profile
// to the LLM, prints the normalized chips, and asserts everything landed inside
// the closed taxonomy. Run with `npm run smoke:extract` (needs OPENAI_API_KEY).

import { extract } from "../lib/extract";
import { VOCAB } from "../lib/extractNormalize";

const SAMPLE =
  "I just moved to Berlin from Lisbon and I'm working on a startup. " +
  "I'm pretty ambitious but chill, and I love climbing and techno on weekends. " +
  "I'm looking for a small group of curious, creative people to actually do things with, " +
  "ideally around Kreuzberg, on weekend evenings. Budget-wise I'm easy.";

function offVocab(tags: string[], allowed: readonly string[], extra: string[] = []): string[] {
  const ok = new Set([...allowed.map((a) => a.toLowerCase()), ...extra]);
  return tags.filter((t) => !ok.has(t.toLowerCase()));
}

async function main() {
  console.log("TRANSCRIPT:\n" + SAMPLE + "\n");
  const { self, lookingFor } = await extract(SAMPLE);

  console.log("SELF:", JSON.stringify(self, null, 2));
  console.log("LOOKING FOR:", JSON.stringify(lookingFor, null, 2));

  // Guardrail: nothing off-taxonomy slipped through (lifeContext is open).
  const stray = [
    ...offVocab(self.personality, VOCAB.personality),
    ...offVocab(self.interests, VOCAB.interests),
    ...offVocab(self.activityTypes, VOCAB.activities),
    ...offVocab(self.socialPreferences, VOCAB.social),
    ...offVocab(self.vibeKeywords, VOCAB.vibe),
    ...offVocab(self.neighborhoods ?? [], VOCAB.neighborhoods, ["any"]),
    ...offVocab(self.availability ?? [], VOCAB.availability),
    ...offVocab(lookingFor.connectionType, VOCAB.connectionType),
  ];

  if (stray.length > 0) {
    console.error("\nFAIL: off-taxonomy tags leaked:", stray);
    process.exit(1);
  }
  console.log("\nPASS: every tag is within the closed taxonomy.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
