import { NextResponse, type NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@/lib/supabase/server";
import { userFromRow } from "@/lib/userRow";
import { embedQuery } from "@/lib/embed";
import { retrieveTopK, buildContext, type EmbeddedChunk } from "@/lib/ragRetrieve";
import { oraAgentTurn } from "@/lib/oraAgent";
import { executeOraTool } from "@/lib/oraTools";
import type { ChatMessage } from "@/lib/aiProvider";

// POST /api/ora/chat
//
// Body: { message: string, history?: { role: "user"|"assistant", content: string }[] }
// One turn of the in-app Ora agent. Thin wrapper: authenticate, retrieve
// knowledge, run the agent (which may call plan tools scoped to this user),
// return the reply and any plan it produced.

export const runtime = "nodejs";

// Knowledge vectors are built at deploy time (npm run build:knowledge) and read
// once per server process.
let KNOWLEDGE: EmbeddedChunk[] | null = null;
function knowledge(): EmbeddedChunk[] {
  if (!KNOWLEDGE) {
    const file = join(process.cwd(), "data", "knowledge-embeddings.json");
    KNOWLEDGE = JSON.parse(readFileSync(file, "utf8")) as EmbeddedChunk[];
  }
  return KNOWLEDGE;
}

interface ChatBody {
  message?: unknown;
  history?: unknown;
}

function parseHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m as ChatMessage).role !== undefined &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string",
    )
    .slice(-10);
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user: authUser },
  } = await sb.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  const message = body.message.trim();
  const history = parseHistory(body.history);

  try {
    const { data: requesterRow, error: lookupErr } = await sb
      .from("users")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (lookupErr) throw new Error(`User lookup failed: ${lookupErr.message}`);
    if (!requesterRow) {
      return NextResponse.json(
        { error: "Finish onboarding before talking to Ora about your plans" },
        { status: 400 },
      );
    }
    const requester = userFromRow(requesterRow);

    // Retrieve knowledge to ground the turn.
    const queryVec = await embedQuery(message);
    const hits = retrieveTopK(queryVec, knowledge(), { k: 4, minScore: 0.2 });
    const context = buildContext(hits);

    const result = await oraAgentTurn({
      userMessage: message,
      history,
      knowledge: context,
      runTool: (name, input) => executeOraTool({ sb, requester }, name, input),
    });

    return NextResponse.json({ reply: result.reply, plan: result.plan ?? null, toolsUsed: result.toolsUsed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ora failed to respond" },
      { status: 500 },
    );
  }
}
