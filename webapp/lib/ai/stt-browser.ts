"use client";
// Local speech-to-text: Whisper runs inside the browser (transformers.js / WASM).
// Audio is decoded and transcribed on this device; only the transcript is ever sent to the app server.
// The model weights are fetched once from Hugging Face, then served from the browser cache.
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

export function loadWhisper(onProgress?: (pct: number) => void) {
  asr ??= import("@huggingface/transformers").then(
    ({ pipeline }) =>
      pipeline("automatic-speech-recognition", "Xenova/whisper-base.en", {
        progress_callback: (p: { status: string; progress?: number }) => {
          if (p.status === "progress" && p.progress != null) onProgress?.(Math.round(p.progress));
        },
      }) as Promise<AutomaticSpeechRecognitionPipeline>,
  );
  asr.catch(() => (asr = null));
  return asr;
}

export async function transcribeLocally(audio: Blob, onProgress?: (pct: number) => void): Promise<string> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  const buf = await ctx.decodeAudioData(await audio.arrayBuffer());
  await ctx.close();
  const raw = buf.getChannelData(0);
  let peak = 0;
  for (const v of raw) peak = Math.max(peak, Math.abs(v));
  // Whisper hallucinates words ("you") on silence, so refuse near-silent audio.
  if (peak < 0.02) throw new Error("SILENT");
  const gain = 0.9 / peak;
  const pcm = peak < 0.5 ? raw.map((v) => v * gain) : raw;
  const model = await loadWhisper(onProgress);
  const out = await model(pcm, { chunk_length_s: 30 });
  return (Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text).trim();
}
