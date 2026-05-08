import { openai, MODELS } from "./openai";

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
