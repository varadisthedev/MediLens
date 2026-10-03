"use client";
// Local speech-to-text: Whisper runs inside the browser (transformers.js / WASM).
// Audio is decoded and transcribed on this device; only the transcript is ever sent to the app server.
// The model weights are fetched once from Hugging Face, then served from the browser cache.
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

export function loadWhisper(onProgress?: (pct: number) => void) {
  asr ??= import("@huggingface/transformers").then(
    ({ pipeline }) =>
      pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
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
  const pcm = buf.getChannelData(0);
  const model = await loadWhisper(onProgress);
  const out = await model(pcm, { chunk_length_s: 30 });
  return (Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text).trim();
}
