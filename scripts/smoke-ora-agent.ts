// Smoke test for the in-app Ora agent (Phase 2). Uses a STUB tool runner (no
// database) plus a real LLM call, to verify the agent selects the right tool
// and grounds answers. Run with `npm run smoke:ora-agent`.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { embedQuery } from "../lib/embed";
import { retrieveTopK, buildContext, type EmbeddedChunk } from "../lib/ragRetrieve";
import { oraAgentTurn } from "../lib/oraAgent";
import type { OraToolResult } from "../lib/oraTools";

const FAKE_PLAN = {
  planId: "p1",
  createdForUserId: "u1",
  createdForDisplayName: "You",
  activityType: "boulder gym",
  place: { id: "v1", name: "Ostbloc", type: "gym", neighborhood: "Friedrichshain", address: "", description: "" },
  dateTime: "2026-07-01T17:00:00.000Z",
  vibe: ["active"],
  attendees: [
    { userId: "a", displayName: "Anton" },
    { userId: "b", displayName: "Nour" },
  ],
  whyThisPlan: "",
} as unknown as NonNullable<OraToolResult["plan"]>;

let calls: { name: string; input: Record<string, unknown> }[] = [];
async function runTool(name: string, input: Record<string, unknown>): Promise<OraToolResult> {
  calls.push({ name, input });
  switch (name) {
    case "get_current_plan":
      return { result: "boulder gym at Ostbloc (Friedrichshain), status ready, with Anton, Nour.", plan: FAKE_PLAN };
    case "refine_plan":
      return { result: `Refined: ${(input.activity as string) ?? "new group"} at a fitting venue.`, plan: FAKE_PLAN };
    case "request_new_plan":
      return { result: "New plan created.", plan: FAKE_PLAN };
    case "withdraw_current_plan":
      return { result: "Withdrawn from the current plan." };
    default:
      return { result: "ok" };
  }
}

const chunks = JSON.parse(
  readFileSync(join(process.cwd(), "data", "knowledge-embeddings.json"), "utf8"),
) as EmbeddedChunk[];

async function turn(message: string) {
  calls = [];
  const q = await embedQuery(message);
  const knowledge = buildContext(retrieveTopK(q, chunks, { k: 4, minScore: 0.2 }));
  const res = await oraAgentTurn({ userMessage: message, knowledge, runTool });
  console.log(`\nUSER: ${message}`);
  console.log(`TOOLS: ${res.toolsUsed.join(", ") || "(none)"}`);
  console.log(`ORA: ${res.reply}`);
}

async function main() {
  // Refinement (the hero): should call refine_plan with an outdoorsy activity.
  await turn("Can you make my plan more outdoorsy?");
  // Knowledge question: should answer grounded, no tool.
  await turn("How does Aura decide who to match me with?");
  // Destructive: should confirm first, not withdraw immediately.
  await turn("Actually cancel my plan");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
