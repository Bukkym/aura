import { NextResponse, type NextRequest } from "next/server";
import { extract } from "@/lib/extract";
import { generateText } from "@/lib/aiProvider";
import { onboardingConverseTurn } from "@/lib/onboardingAgent";
import type { MissingField } from "@/lib/onboardingMissing";

// POST /api/onboarding/converse
//
// Body: { utterances: string[] } — the opening self-description followed by any
// follow-up answers, accumulated by the client.
// Returns: { done, reply, draft, missing }.
//
// Not auth-gated: onboarding runs before the just-in-time auth gate (the gate
// fires when the finished chips are submitted at /plan). Thin wrapper around
// lib/onboardingAgent: extract from the whole conversation, decide whether to
// ask one more thing, and hand back a draft for the chip flow to prefill.

export const runtime = "nodejs";

const ASK_SYSTEM = `You are Ora, a warm, brief onboarding guide for Aura, a social app that introduces someone to a small compatible group and a place to meet in Berlin. You've heard what the person said so far and still need a little more to find their people.

Ask ONE short, friendly follow-up question that covers the most important missing things listed below. One or two sentences, conversational, no lists, no preamble, no em dashes. Do not repeat what they already told you.`;

interface ConverseBody {
  utterances?: unknown;
}

function parseUtterances(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

// Claude phrases the next question; the deterministic canned questions from the
// missing-field checker are both the fallback and the content guide.
async function askFollowUp(args: { missing: MissingField[]; transcript: string }): Promise<string> {
  const top = args.missing.slice(0, 2);
  const fallback = top[0]?.question ?? "Tell me a little more about what you're after.";
  if (top.length === 0) return fallback;
  const wants = top.map((m) => `- ${m.label} (e.g. ${m.question})`).join("\n");
  try {
    const reply = await generateText({
      system: ASK_SYSTEM,
      messages: [
        {
          role: "user",
          content: `What they've said:\n${args.transcript}\n\nStill missing:\n${wants}\n\nAsk one warm follow-up question.`,
        },
      ],
      maxTokens: 120,
    });
    return reply.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  let body: ConverseBody;
  try {
    body = (await request.json()) as ConverseBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const utterances = parseUtterances(body.utterances);
  if (utterances.length === 0) {
    return NextResponse.json(
      { error: "utterances must be a non-empty array of strings" },
      { status: 400 },
    );
  }

  try {
    const result = await onboardingConverseTurn({
      utterances,
      extractFn: extract,
      askFn: askFollowUp,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Onboarding turn failed" },
      { status: 500 },
    );
  }
}
