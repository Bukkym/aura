import type Anthropic from "@anthropic-ai/sdk";
import { generateWithTools, type ChatMessage } from "./aiProvider";
import { ORA_TOOLS, type OraToolResult } from "./oraTools";
import type { PlanResponse } from "./planResponse";

// The in-app Ora agent: one conversational turn that can answer questions about
// Aura (grounded in retrieved knowledge) and perform tasks via tool-calling
// (refine / request / withdraw a plan). The tool runner is injected so the loop
// can be unit/smoke-tested without a database. I/O orchestration, so this module
// is exempt from the lib-test guardrail; its pure tool schemas live in
// lib/oraTools.ts and are tested there.

const ORA_BASE = `You are Ora, the assistant inside Aura, a social app that introduces people to a small compatible group and a place to meet in their city.

You can do two things:
1. Answer questions about Aura, using ONLY the knowledge context provided below. If the context does not cover it, say you are not sure and steer back to what you can help with. Never invent features.
2. Help with the user's plans using your tools: refine their current plan, create a new one, withdraw from one, or look one up.

Rules:
- For refinements ("more outdoorsy", "smaller", "a chill crowd", "a different night", "different people"), use the refine_plan tool. Translate the wish into a concrete activity from Aura's vocabulary, and set fresh_group when they want different people.
- Withdrawing from a plan is destructive: confirm with the user in plain words first, and only call withdraw_current_plan after they clearly say yes.
- The matcher decides who fits; you orchestrate it, you do not invent matches or names.
- Match explanations are suggestions, not certainties.
- Keep replies short, warm, and plain. Two or three sentences. Do not use em dashes.`;

export function buildOraSystem(knowledge: string): string {
  const ctx = knowledge.trim()
    ? `\n\nKnowledge context:\n${knowledge.trim()}`
    : "\n\nKnowledge context: (none retrieved for this message)";
  return ORA_BASE + ctx;
}

export interface OraTurnResult {
  reply: string;
  plan?: PlanResponse;
  toolsUsed: string[];
}

/**
 * Run one Ora turn. Loops over tool calls until the model returns a final text
 * answer (or maxSteps is hit). Returns the reply, the most recent plan a tool
 * surfaced (for the UI), and which tools were used.
 */
export async function oraAgentTurn(opts: {
  userMessage: string;
  history?: ChatMessage[];
  knowledge: string;
  runTool: (name: string, input: Record<string, unknown>) => Promise<OraToolResult>;
  model?: string;
  maxSteps?: number;
}): Promise<OraTurnResult> {
  const system = buildOraSystem(opts.knowledge);
  const maxSteps = opts.maxSteps ?? 4;
  const messages: Anthropic.MessageParam[] = [
    ...(opts.history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: opts.userMessage },
  ];

  const toolsUsed: string[] = [];
  let plan: PlanResponse | undefined;
  let lastText = "";

  for (let step = 0; step < maxSteps; step++) {
    const res = await generateWithTools({
      system,
      messages,
      tools: ORA_TOOLS,
      model: opts.model,
      maxTokens: 700,
    });
    lastText = res.text || lastText;

    if (res.toolCalls.length === 0) {
      return { reply: lastText, plan, toolsUsed };
    }

    // Echo the assistant's tool-use turn back, then answer each tool call.
    messages.push({ role: "assistant", content: res.raw.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const call of res.toolCalls) {
      toolsUsed.push(call.name);
      const out = await opts.runTool(call.name, call.input);
      if (out.plan) plan = out.plan;
      toolResults.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: out.result,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  // Ran out of steps: surface whatever the model last said, or a safe fallback.
  return {
    reply: lastText || "I have updated things, but let me know if that is what you wanted.",
    plan,
    toolsUsed,
  };
}
