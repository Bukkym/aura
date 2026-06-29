// Pure in-memory vector retrieval for the Ora knowledge base. The knowledge
// chunks are embedded once at build time (scripts/build-knowledge-embeddings.ts)
// into data/knowledge-embeddings.json; at request time we embed only the user's
// query (lib/embed.ts) and cosine-match here. No DB, no network in this module,
// so it is fully unit-testable.

export interface EmbeddedChunk {
  id: string;
  source: string;
  title: string;
  heading: string;
  text: string;
  embedding: number[];
}

export interface RetrievedChunk extends EmbeddedChunk {
  score: number;
}

/** Cosine similarity of two equal-length vectors. Returns 0 for empty or
 *  zero-magnitude vectors rather than NaN. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Rank chunks by cosine similarity to the query embedding and return the top k.
 * `minScore` drops weakly-related chunks so the agent can fall back to "no
 * relevant context" instead of grounding on noise (an Ex 21 guardrail).
 */
export function retrieveTopK(
  queryEmbedding: number[],
  chunks: EmbeddedChunk[],
  opts: { k?: number; minScore?: number } = {},
): RetrievedChunk[] {
  const k = opts.k ?? 4;
  const minScore = opts.minScore ?? 0;
  return chunks
    .map((c) => ({ ...c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Join retrieved chunks into a context block for the prompt, most relevant
 *  first. Returns an empty string when nothing cleared the threshold. */
export function buildContext(chunks: RetrievedChunk[]): string {
  return chunks.map((c) => c.text).join("\n\n---\n\n");
}
