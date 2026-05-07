// Stub for Whisper transcription. Real implementation posts the audio blob
// to /api/transcribe, which calls OpenAI Whisper. For the scaffold we mock.

export async function transcribe(_audio: Blob): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  return "I just moved to Berlin from Lisbon. I'm working on a side project and like climbing on weekends. Looking for chill, ambitious people who actually do stuff.";
}
