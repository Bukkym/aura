// Guardrail: every pure-logic module in /lib must have a unit test.
//
// The project rule in .claude/rules/project-quality.md says "Every new function
// added to /lib must have at least one corresponding test in /lib/__tests__/".
// Prose alone is a guardrail an AI agent can quietly ignore. This script turns
// that rule into an executable check so a missing test fails CI instead of
// slipping through review.
//
// Usage: npm run check:lib-tests
// Exit 0 when every gated module has a test that imports it, exit 1 otherwise.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LIB_DIR = join(process.cwd(), "lib");
const TESTS_DIR = join(LIB_DIR, "__tests__");

// I/O-bound wrappers that call OpenAI or Supabase. They are exercised by the
// smoke scripts (npm run smoke:*), not by unit tests, so they are exempt from
// this gate. Adding a new lib module that is NOT pure logic means adding it
// here, on purpose, with a reason. A new module in neither list fails the gate.
const IO_EXEMPT = new Set<string>([
  "openai", // thin OpenAI client factory
  "embed", // OpenAI embeddings call
  "transcribe", // OpenAI audio transcription call
  "extract", // OpenAI extraction call
  "findSimilar", // pgvector RPC wrapper
  "generatePlan", // orchestrates Supabase reads + the matcher
  "planResponse", // shapes a persisted plan row for the API
  "aiProvider", // thin Anthropic client wrapper (Ora agent)
]);

function libModules(): string[] {
  return readdirSync(LIB_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
    .map((f) => f.replace(/\.ts$/, ""));
}

function hasTestFor(moduleName: string): boolean {
  const testFile = join(TESTS_DIR, `${moduleName}.test.ts`);
  let source: string;
  try {
    source = readFileSync(testFile, "utf8");
  } catch {
    return false;
  }
  // The test must actually import the module under test, not just exist.
  return new RegExp(`from ["']\\.\\./${moduleName}["']`).test(source);
}

const modules = libModules();
const missing: string[] = [];

for (const mod of modules) {
  if (IO_EXEMPT.has(mod)) continue;
  if (!hasTestFor(mod)) missing.push(mod);
}

const gated = modules.filter((m) => !IO_EXEMPT.has(m));
console.log(
  `lib test guardrail: ${gated.length - missing.length}/${gated.length} pure-logic modules covered ` +
    `(${IO_EXEMPT.size} I/O modules exempt).`,
);

if (missing.length > 0) {
  console.error("\nMissing unit tests for pure-logic lib modules:");
  for (const m of missing) {
    console.error(`  - lib/${m}.ts  ->  add lib/__tests__/${m}.test.ts`);
  }
  console.error(
    "\nProject rule: every pure-logic /lib module needs a test that imports it.",
  );
  console.error(
    "If a module is genuinely an I/O wrapper, add it to IO_EXEMPT with a reason.",
  );
  process.exit(1);
}

console.log("All pure-logic lib modules have a unit test. Guardrail passed.");
