import Anthropic from "@anthropic-ai/sdk";
import { getOpenAI, MODELS } from "./openai";
import {
  toAnthropicMessages,
  toOpenAiMessages,
  toOpenAiTool,
  parseOpenAiToolCalls,
  type AgentMessage,
} from "./aiMessages";

// Provider-agnostic AI layer for Ora. OpenAI is the default provider (Anthropic
// access is expected to sunset); the Anthropic implementation stays behind the
// same seam so AI_PROVIDER=anthropic switches back with no code change.
// Embeddings stay on OpenAI (lib/embed.ts) regardless, per
// technical/04-ai-model-strategy.md.
//
// This is an I/O wrapper around the SDKs, so it is exempt from the lib-test
// guardrail (like lib/openai.ts). The pure transcript/tool mapping lives in
// lib/aiMessages.ts and is unit-tested there.

export type AiProvider = "anthropic" | "openai";

const provider: AiProvider =
  (process.env.AI_PROVIDER as AiProvider) === "anthropic" ? "anthropic" : "openai";

export const AI = {
  provider,
  // Per-provider default, overridable with OPENAI_MODEL / ANTHROPIC_MODEL so a
  // model bump never needs a deploy-blocking code change.
  model:
    provider === "anthropic"
      ? process.env.ANTHROPIC_MODEL || "claude-opus-4-8"
      : process.env.OPENAI_MODEL || MODELS.chat,
} as const;

let anthropicClient: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local or set AI_PROVIDER=openai.",
    );
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
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
  if (AI.provider === "anthropic") {
    const res = await anthropic().messages.create({
      model: opts.model ?? AI.model,
      max_tokens: opts.maxTokens ?? 1024,
      ...(opts.system ? { system: opts.system } : {}),
      messages: opts.messages,
    });
    return textOf(res.content);
  }

  const res = await getOpenAI().chat.completions.create({
    model: opts.model ?? AI.model,
    max_completion_tokens: opts.maxTokens ?? 1024,
    messages: toOpenAiMessages(opts.messages, opts.system),
  });
  return res.choices[0]?.message?.content ?? "";
}

/**
 * A single agent turn with tool-calling. Returns the assistant's text and any
 * tool calls it requested. The caller runs the tools, appends the assistant
 * turn and the tool results to the transcript, and decides whether to continue
 * the loop (Ora's tools mutate user state, so we keep the loop in the route,
 * not hidden in the SDK).
 */
export async function generateWithTools(opts: {
  system?: string;
  messages: AgentMessage[];
  tools: ToolDef[];
  maxTokens?: number;
  model?: string;
}): Promise<{
  text: string;
  toolCalls: ToolCall[];
  stopReason: string | null;
}> {
  if (AI.provider === "anthropic") {
    const res = await anthropic().messages.create({
      model: opts.model ?? AI.model,
      max_tokens: opts.maxTokens ?? 1024,
      ...(opts.system ? { system: opts.system } : {}),
      tools: opts.tools as Anthropic.Tool[],
      messages: toAnthropicMessages(opts.messages) as Anthropic.MessageParam[],
    });
    const toolCalls: ToolCall[] = res.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));
    return { text: textOf(res.content), toolCalls, stopReason: res.stop_reason };
  }

  const res = await getOpenAI().chat.completions.create({
    model: opts.model ?? AI.model,
    max_completion_tokens: opts.maxTokens ?? 1024,
    messages: toOpenAiMessages(opts.messages, opts.system),
    tools: opts.tools.map(toOpenAiTool),
  });
  const choice = res.choices[0];
  return {
    text: choice?.message?.content ?? "",
    toolCalls: parseOpenAiToolCalls(choice?.message?.tool_calls),
    stopReason: choice?.finish_reason ?? null,
  };
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
