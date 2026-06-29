import Anthropic from "@anthropic-ai/sdk";

// Provider-agnostic AI layer for Ora. Anthropic (Claude) today, with a thin
// seam so an OpenAI implementation can slot in later (the user asked to keep
// that option open). Embeddings stay on OpenAI (lib/embed.ts) regardless, per
// technical/04-ai-model-strategy.md.
//
// This is an I/O wrapper around the Anthropic SDK, so it is exempt from the
// lib-test guardrail (like lib/openai.ts). The pure logic that sits on top of
// it (RAG retrieval, the missing-fields checker) lives in its own modules and
// is unit-tested.

export type AiProvider = "anthropic" | "openai";

export const AI = {
  provider: (process.env.AI_PROVIDER as AiProvider) || "anthropic",
  // Default to the most capable model; override with ANTHROPIC_MODEL (e.g.
  // claude-sonnet-4-6 for lower cost on high-volume turns).
  model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
} as const;

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (AI.provider !== "anthropic") {
    throw new Error(
      `AI_PROVIDER="${AI.provider}" is not implemented yet. Only "anthropic" is wired. ` +
        "Add an OpenAI implementation in lib/aiProvider.ts to switch.",
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local — see .env.local.example.",
    );
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** One-shot text generation: messages in, plain text out. */
export async function generateText(opts: {
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const res = await anthropic().messages.create({
    model: opts.model ?? AI.model,
    max_tokens: opts.maxTokens ?? 1024,
    ...(opts.system ? { system: opts.system } : {}),
    messages: opts.messages,
  });
  return textOf(res.content);
}

/**
 * A single agent turn with tool-calling. Returns the assistant's text and any
 * tool calls it requested. The caller runs the tools and decides whether to
 * continue the loop (Ora's tools mutate user state, so we keep the loop in the
 * route, not hidden in the SDK).
 */
export async function generateWithTools(opts: {
  system?: string;
  messages: Anthropic.MessageParam[];
  tools: ToolDef[];
  maxTokens?: number;
  model?: string;
}): Promise<{
  text: string;
  toolCalls: ToolCall[];
  stopReason: string | null;
  raw: Anthropic.Message;
}> {
  const res = await anthropic().messages.create({
    model: opts.model ?? AI.model,
    max_tokens: opts.maxTokens ?? 1024,
    ...(opts.system ? { system: opts.system } : {}),
    tools: opts.tools as Anthropic.Tool[],
    messages: opts.messages,
  });
  const toolCalls: ToolCall[] = res.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));
  return { text: textOf(res.content), toolCalls, stopReason: res.stop_reason, raw: res };
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
