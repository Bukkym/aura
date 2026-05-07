// In-memory cosine similarity. Hidden behind this single interface so we can
// swap to sqlite-vec or Pinecone later without touching the rest of the code.
// Per the architectural rules in /technical/01-mvp-decisions.md.

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SimilarItem<T> {
  item: T;
  score: number;
}

export function findSimilar<T>(
  query: number[],
  items: { embedding: number[]; data: T }[],
  k: number
): SimilarItem<T>[] {
  return items
    .map(({ embedding, data }) => ({ item: data, score: cosine(query, embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
