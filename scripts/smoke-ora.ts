// Smoke test for the Ora RAG path (Phase 0 provider + Phase 1 retrieval).
// Loads the prebuilt knowledge embeddings, embeds a question, retrieves the
// most relevant chunks, and asks the model to answer grounded only on them.
// Run with `npm run smoke:ora`.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { embed } from "../lib/embed";
import { retrieveTopK, buildContext, type EmbeddedChunk } from "../lib/ragRetrieve";
import { generateText, AI } from "../lib/aiProvider";

const SYSTEM = `You are Ora, the assistant inside Aura, a social app that introduces people to a small group and a place to meet in their city.
Answer the user's question using ONLY the context below. If the context does not contain the answer, say you are not sure and suggest what Aura can help with. Keep it to two or three sentences, warm and plain. Do not invent features. Do not use em dashes.`;

async function ask(question: string, chunks: EmbeddedChunk[]) {
  const q = await embed(question);
  const hits = retrieveTopK(q, chunks, { k: 4, minScore: 0.2 });
  const context = buildContext(hits);
  const answer = await generateText({
    system: SYSTEM,
    messages: [
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
    maxTokens: 300,
  });
  console.log(`\nQ: ${question}`);
  console.log(`   retrieved: ${hits.map((h) => `${h.source}#${h.heading} (${h.score.toFixed(2)})`).join(", ")}`);
  console.log(`A: ${answer}`);
}

async function main() {
  const file = join(process.cwd(), "data", "knowledge-embeddings.json");
  const chunks = JSON.parse(readFileSync(file, "utf8")) as EmbeddedChunk[];
  console.log(`Loaded ${chunks.length} knowledge chunks. Model: ${AI.model}.`);

  await ask("How does Aura decide who to match me with?", chunks);
  await ask("Can I change a plan if I do not like it?", chunks);
  await ask("Will other people see my phone number?", chunks);
  // Out-of-scope: should fall back rather than hallucinate.
  await ask("What is the capital of France?", chunks);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
