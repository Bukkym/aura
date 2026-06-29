import OpenAI from "openai";

// Lazy OpenAI client. The key is checked when the client is first USED, not at
// import time, so importing this module (transitively, via lib/embed.ts and the
// Ora chat route) never throws during `next build` where OPENAI_API_KEY is
// absent. Construction is deferred for the same reason: `new OpenAI()` with no
// key throws immediately.

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local — see .env.local.example.",
    );
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const MODELS = {
  embedding: "text-embedding-3-small",
  chat: "gpt-4o-mini",
  chatLarge: "gpt-4o",
  whisper: "whisper-1",
} as const;
