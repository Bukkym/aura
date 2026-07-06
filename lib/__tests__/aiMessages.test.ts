import { describe, it, expect } from "vitest";
import {
  toOpenAiMessages,
  toOpenAiTool,
  parseOpenAiToolCalls,
  toAnthropicMessages,
  type AgentMessage,
} from "../aiMessages";
import type { ToolDef } from "../aiProvider";

const TOOL: ToolDef = {
  name: "refine_plan",
  description: "Adjust the plan.",
  input_schema: {
    type: "object",
    properties: { activity: { type: "string" } },
    additionalProperties: false,
  },
};

const TRANSCRIPT: AgentMessage[] = [
  { role: "user", content: "make it more outdoorsy" },
  {
    role: "assistant",
    content: "Let me adjust that.",
    toolCalls: [{ id: "call_1", name: "refine_plan", input: { activity: "hiking" } }],
  },
  { role: "tool", results: [{ toolCallId: "call_1", content: "Refined plan: hiking." }] },
  { role: "assistant", content: "Done, you are set for hiking." },
];

describe("toOpenAiMessages()", () => {
  it("prepends the system prompt when given", () => {
    const out = toOpenAiMessages([{ role: "user", content: "hi" }], "You are Ora.");
    expect(out[0]).toEqual({ role: "system", content: "You are Ora." });
    expect(out[1]).toEqual({ role: "user", content: "hi" });
  });

  it("omits the system message when absent", () => {
    const out = toOpenAiMessages([{ role: "user", content: "hi" }]);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe("user");
  });

  it("maps an assistant tool-call turn to tool_calls with stringified arguments", () => {
    const out = toOpenAiMessages(TRANSCRIPT);
    const assistant = out[1];
    if (assistant.role !== "assistant") throw new Error("expected assistant");
    expect(assistant.content).toBe("Let me adjust that.");
    expect(assistant.tool_calls).toEqual([
      {
        id: "call_1",
        type: "function",
        function: { name: "refine_plan", arguments: JSON.stringify({ activity: "hiking" }) },
      },
    ]);
  });

  it("uses null content for a tool-call turn with no text", () => {
    const out = toOpenAiMessages([
      { role: "assistant", content: "", toolCalls: [{ id: "c", name: "t", input: {} }] },
    ]);
    if (out[0].role !== "assistant") throw new Error("expected assistant");
    expect(out[0].content).toBeNull();
  });

  it("fans one tool message out into one OpenAI tool message per result", () => {
    const out = toOpenAiMessages([
      {
        role: "tool",
        results: [
          { toolCallId: "a", content: "first" },
          { toolCallId: "b", content: "second" },
        ],
      },
    ]);
    expect(out).toEqual([
      { role: "tool", tool_call_id: "a", content: "first" },
      { role: "tool", tool_call_id: "b", content: "second" },
    ]);
  });
});

describe("toOpenAiTool()", () => {
  it("wraps a ToolDef as an OpenAI function tool, keeping the schema", () => {
    expect(toOpenAiTool(TOOL)).toEqual({
      type: "function",
      function: {
        name: "refine_plan",
        description: "Adjust the plan.",
        parameters: TOOL.input_schema,
      },
    });
  });
});

describe("parseOpenAiToolCalls()", () => {
  it("parses JSON arguments into input objects", () => {
    const calls = parseOpenAiToolCalls([
      { id: "c1", function: { name: "refine_plan", arguments: '{"activity":"hiking"}' } },
    ]);
    expect(calls).toEqual([{ id: "c1", name: "refine_plan", input: { activity: "hiking" } }]);
  });

  it("returns empty input for malformed or non-object arguments", () => {
    const calls = parseOpenAiToolCalls([
      { id: "c1", function: { name: "a", arguments: "not json" } },
      { id: "c2", function: { name: "b", arguments: "[1,2]" } },
      { id: "c3", function: { name: "c", arguments: "" } },
    ]);
    expect(calls.map((c) => c.input)).toEqual([{}, {}, {}]);
  });

  it("returns [] for undefined or null", () => {
    expect(parseOpenAiToolCalls(undefined)).toEqual([]);
    expect(parseOpenAiToolCalls(null)).toEqual([]);
  });
});

describe("toAnthropicMessages()", () => {
  it("maps an assistant tool-call turn to text + tool_use blocks", () => {
    const out = toAnthropicMessages(TRANSCRIPT);
    expect(out[1]).toEqual({
      role: "assistant",
      content: [
        { type: "text", text: "Let me adjust that." },
        { type: "tool_use", id: "call_1", name: "refine_plan", input: { activity: "hiking" } },
      ],
    });
  });

  it("skips the text block when the tool-call turn has no text", () => {
    const out = toAnthropicMessages([
      { role: "assistant", content: "", toolCalls: [{ id: "c", name: "t", input: {} }] },
    ]);
    expect(out[0].content).toEqual([{ type: "tool_use", id: "c", name: "t", input: {} }]);
  });

  it("maps tool results to a user turn of tool_result blocks", () => {
    const out = toAnthropicMessages(TRANSCRIPT);
    expect(out[2]).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "call_1", content: "Refined plan: hiking." }],
    });
  });

  it("passes plain user and assistant turns through as strings", () => {
    const out = toAnthropicMessages(TRANSCRIPT);
    expect(out[0]).toEqual({ role: "user", content: "make it more outdoorsy" });
    expect(out[3]).toEqual({ role: "assistant", content: "Done, you are set for hiking." });
  });
});
