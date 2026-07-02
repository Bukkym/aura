import { getOpenAI, MODELS } from "./openai";
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

// Runtime guard: Module 3 has zero OpenAI calls in the request path. The seed
// scripts still need embeddings, so they set EMBED_ALLOW_RUNTIME=true before
// importing. Any stray import from app/ or lib/ that tries to embed at request
// time throws loudly instead of silently re-introducing an AI dependency.
function assertEmbedAllowed(): void {
  if (process.env.EMBED_ALLOW_RUNTIME !== "true") {
    throw new Error(
      "embed() is disabled in the request path (Module 3 is AI-free). " +
        "Set EMBED_ALLOW_RUNTIME=true only in seed scripts.",
    );
  }
}

export async function embed(text: string): Promise<number[]> {
  assertEmbedAllowed();
  const r = await getOpenAI().embeddings.create({
    model: MODELS.embedding,
    input: text,
  });
  return r.data[0].embedding;
}

// Intentional runtime embedding for the Ora agent's RAG queries. The Module-3
// guard above blocks ACCIDENTAL request-path embedding; this is the explicit,
// reviewed opt-in for the one place we now embed live: the user's question, so
// it can be cosine-matched against the prebuilt knowledge vectors. The knowledge
// base itself is embedded at build time, never here.
export async function embedQuery(text: string): Promise<number[]> {
  const r = await getOpenAI().embeddings.create({
    model: MODELS.embedding,
    input: text,
  });
  return r.data[0].embedding;
}

// Intentional runtime embedding of a REAL user's profile at onboarding /
// plan-create time. Same explicit, reviewed opt-in past the Module-3 guard as
// embedQuery: a chip-onboarded user gets NULL embeddings, so this lazily
// computes their self/lookingFor vectors with the SAME model as the seed pool
// (MODELS.embedding), landing them in the same vector sub-region. Best-effort
// at the call site: a failure must not block plan creation.
export async function embedProfile(text: string): Promise<number[]> {
  const r = await getOpenAI().embeddings.create({
    model: MODELS.embedding,
    input: text,
  });
  return r.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  assertEmbedAllowed();
  if (texts.length === 0) return [];
  const r = await getOpenAI().embeddings.create({
    model: MODELS.embedding,
    input: texts,
  });
  return r.data.map((d) => d.embedding);
}
