import type { LookingForExtracted, SelfExtracted } from "@/types";
import { generateText } from "./aiProvider";
import {
  normalizeExtraction,
  parseExtractionJson,
  VOCAB,
} from "./extractNormalize";

// Real extraction pass: free speech -> structured chips. I/O wrapper (calls
// Claude), so it sits outside the lib-test guardrail. The deterministic part
// (clamp to the closed taxonomy + canonicalize + parse the reply) lives in the
// pure, unit-tested lib/extractNormalize.ts; this module only builds the prompt,
// makes the call, and hands the reply to that normalizer.

function list(label: string, items: readonly string[]): string {
  return `${label}: ${items.join(", ")}`;
}

// The model is shown the EXACT closed vocab and told to map onto it, never
// invent. Anything off-list is dropped by normalizeExtraction anyway, but
// constraining up front keeps the output clean and on-budget.
const SYSTEM = `You extract a Berlin social-matching profile from how someone describes themselves and who they want to meet. You map their words onto a CLOSED set of tags and return JSON only.

Rules:
- Use ONLY the exact tag strings from the vocabularies below. Do not invent tags, rephrase them, or translate them.
- Pick a tag only when the person's words genuinely imply it. Leave a field as an empty array if they did not touch it. Do NOT pad fields to look complete.
- "self" = how they describe themselves. "lookingFor" = the kind of people and connection they want.
- connectionType uses these labels: "people to do things with", "deep connections", "a friend group", "help finding my footing here".
- budget is a single value (low, mid, high, any) or omit it.
- neighborhoods: use the listed Berlin areas, or "anywhere in Berlin" if they have no preference.

Vocabularies:
${list("personality", VOCAB.personality)}
${list("vibe", VOCAB.vibe)}
${list("interests", VOCAB.interests)}
${list("activities", VOCAB.activities)}
${list("social", VOCAB.social)}
${list("connectionType", ["people to do things with", "deep connections", "a friend group", "help finding my footing here"])}
${list("neighborhoods", VOCAB.neighborhoods)}
${list("availability", VOCAB.availability)}
${list("budget", VOCAB.budget)}

Return ONLY this JSON shape, no prose:
{
  "self": { "personality": [], "vibe": [], "interests": [], "activities": [], "social": [], "neighborhoods": [], "availability": [], "budget": null, "lifeContext": [] },
  "lookingFor": { "personality": [], "vibe": [], "interests": [], "activities": [], "social": [], "connectionType": [], "neighborhoods": [] }
}

lifeContext is free text for situational facts ("new to Berlin", "remote worker"); keep it short.`;

export async function extract(rawInput: string): Promise<{
  self: SelfExtracted;
  lookingFor: LookingForExtracted;
}> {
  const text = await generateText({
    system: SYSTEM,
    messages: [{ role: "user", content: rawInput }],
    maxTokens: 1024,
  });
  return normalizeExtraction(parseExtractionJson(text));
}
