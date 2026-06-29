// Build step: embed the Ora knowledge base once and write the vectors to
// data/knowledge-embeddings.json. Run with `npm run build:knowledge` (which
// sets EMBED_ALLOW_RUNTIME so lib/embed.ts permits the OpenAI call). At request
// time the app loads this JSON and only embeds the user's query, so the
// knowledge embeddings are never recomputed live.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chunkMarkdown } from "../lib/ragChunk";
import { embedBatch } from "../lib/embed";

const KNOWLEDGE_DIR = join(process.cwd(), "knowledge");
const OUT_FILE = join(process.cwd(), "data", "knowledge-embeddings.json");

async function main() {
  const files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    throw new Error(`No markdown files found in ${KNOWLEDGE_DIR}`);
  }

  const chunks = files.flatMap((file) => {
    const md = readFileSync(join(KNOWLEDGE_DIR, file), "utf8");
    return chunkMarkdown(file.replace(/\.md$/, ""), md);
  });

  console.log(`Embedding ${chunks.length} chunks from ${files.length} files...`);
  const vectors = await embedBatch(chunks.map((c) => c.text));

  const embedded = chunks.map((c, i) => ({ ...c, embedding: vectors[i] }));

  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(embedded));
  console.log(
    `Wrote ${embedded.length} embedded chunks to ${OUT_FILE} ` +
      `(${vectors[0]?.length ?? 0} dims each).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
