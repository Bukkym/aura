import { NextResponse, type NextRequest } from "next/server";
import { transcribe } from "@/lib/transcribe";

// POST /api/transcribe
//
// Body: multipart/form-data with an "audio" file field.
// Returns: { text } — the Whisper transcript.
//
// Not auth-gated on purpose: onboarding voice runs BEFORE the just-in-time auth
// gate (technical/05-onboarding-spec.md §6), so a brand-new visitor must be able
// to transcribe. Inputs are validated (type + size) before the paid Whisper call
// so a bad request never reaches OpenAI.

export const runtime = "nodejs";

// Whisper's hard upload limit is 25 MB; reject above that before we spend a call.
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an audio file" },
      { status: 400 },
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json(
      { error: "audio file is required" },
      { status: 400 },
    );
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "audio too large (max 25MB)" },
      { status: 400 },
    );
  }

  try {
    const text = await transcribe(audio);
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 },
    );
  }
}
