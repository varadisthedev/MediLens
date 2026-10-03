// Optional local Hugging Face provider (e.g. a Whisper server). Never required; never throws to the UI.
const BASE = process.env.HUGGINGFACE_BASE_URL;
const KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL = process.env.HUGGINGFACE_MODEL;

export const hfConfigured = () => !!BASE;

/** Transcribe audio with a local HF endpoint. Returns null if not configured or unreachable. */
export async function transcribeWithHF(audio: ArrayBuffer, contentType: string): Promise<string | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}${MODEL ? `/${MODEL}` : ""}`, {
      method: "POST",
      headers: { "Content-Type": contentType, ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}) },
      body: audio,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { text?: string };
    return j.text ?? null;
  } catch {
    return null;
  }
}
