import { openai, MODELS } from "./openai";
import type { LookingForExtracted, SelfExtracted } from "@/types";

// Single source of truth for the embedding-text format. Seed pipeline
// (scripts/seed-users.ts) and live signup (app/api/plan/create) must produce
// identical strings for identical input, otherwise authed users land in a
// slightly different sub-region of the embedding space than the seed pool and
// matching gets weird.
export function stringifyExtractedForEmbed(
  layer: SelfExtracted | LookingForExtracted | undefined | null,
): string {
  if (!layer) return "";
  return Object.entries(layer)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
      return `${k}: ${v}`;
    })
    .join(". ");
}

export async function embed(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({
    model: MODELS.embedding,
    input: text,
  });
  return r.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const r = await openai.embeddings.create({
    model: MODELS.embedding,
    input: texts,
  });
  return r.data.map((d) => d.embedding);
}
