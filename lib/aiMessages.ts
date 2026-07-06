// Provider-agnostic agent transcript, plus the pure mappers that turn it into
// each provider's wire format. The agent loop (lib/oraAgent.ts) speaks ONLY
// these shapes; lib/aiProvider.ts converts at the boundary. Pure module: no
// SDK imports, no I/O, fully unit-tested in lib/__tests__/aiMessages.test.ts.

import type { ToolCall, ToolDef } from "./aiProvider";

/** One entry in an agent conversation, independent of provider. */
export type AgentMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; results: ToolResultMessage[] };

export interface ToolResultMessage {
  toolCallId: string;
  content: string;
}

// ── OpenAI chat-completions wire shapes ──────────────────────────────────────
// Local structural types so this module stays SDK-free; they match the subset
// of ChatCompletionMessageParam the agent actually produces.

export interface OpenAiToolCallWire {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type OpenAiMessageWire =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCallWire[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface OpenAiToolWire {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Map the agnostic transcript (plus optional system prompt) to OpenAI messages. */
export function toOpenAiMessages(
  messages: AgentMessage[],
  system?: string,
): OpenAiMessageWire[] {
  const out: OpenAiMessageWire[] = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    if (m.role === "tool") {
      for (const r of m.results) {
        out.push({ role: "tool", tool_call_id: r.toolCallId, content: r.content });
      }
    } else if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      out.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: JSON.stringify(c.input) },
        })),
      });
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

/** Map a ToolDef (Anthropic-style input_schema) to an OpenAI function tool. */
export function toOpenAiTool(def: ToolDef): OpenAiToolWire {
  return {
    type: "function",
    function: {
      name: def.name,
      description: def.description,
      parameters: def.input_schema,
    },
  };
}

/**
 * Parse OpenAI tool_calls into agnostic ToolCalls. Arguments arrive as a JSON
 * string; anything unparseable becomes an empty input rather than a throw, so
 * one malformed call cannot take down the whole turn.
 */
export function parseOpenAiToolCalls(
  raw: { id: string; function: { name: string; arguments: string } }[] | undefined | null,
): ToolCall[] {
  if (!raw) return [];
  return raw.map((c) => {
    let input: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(c.function.arguments || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        input = parsed as Record<string, unknown>;
      }
    } catch {
      // keep {} for malformed arguments
    }
    return { id: c.id, name: c.function.name, input };
  });
}

// ── Anthropic messages wire shapes ───────────────────────────────────────────

export type AnthropicContentBlockWire =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface AnthropicMessageWire {
  role: "user" | "assistant";
  content: string | AnthropicContentBlockWire[];
}

/** Map the agnostic transcript to Anthropic messages (system stays separate). */
export function toAnthropicMessages(messages: AgentMessage[]): AnthropicMessageWire[] {
  return messages.map((m): AnthropicMessageWire => {
    if (m.role === "tool") {
      return {
        role: "user",
        content: m.results.map((r) => ({
          type: "tool_result" as const,
          tool_use_id: r.toolCallId,
          content: r.content,
        })),
      };
    }
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      const blocks: AnthropicContentBlockWire[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const c of m.toolCalls) {
        blocks.push({ type: "tool_use", id: c.id, name: c.name, input: c.input });
      }
      return { role: "assistant", content: blocks };
    }
    return { role: m.role, content: m.content };
  });
}
