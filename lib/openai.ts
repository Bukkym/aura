import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is not set. Add it to .env.local — see .env.local.example."
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODELS = {
  embedding: "text-embedding-3-small",
  chat: "gpt-4o-mini",
  chatLarge: "gpt-4o",
  whisper: "whisper-1",
} as const;
