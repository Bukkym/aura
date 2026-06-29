import { getOpenAI, MODELS } from "./openai";

// Real speech-to-text via OpenAI Whisper (MODELS.whisper). I/O wrapper, so it
// lives outside the lib-test guardrail (exercised through /api/transcribe and
// the smoke scripts). The route validates the upload before this is reached;
// here we just send the audio and return the transcript text.
export async function transcribe(audio: File): Promise<string> {
  const res = await getOpenAI().audio.transcriptions.create({
    file: audio,
    model: MODELS.whisper,
  });
  return res.text.trim();
}
