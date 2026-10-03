import { z } from "zod";
import {
  CheckInExtraction,
  LocalAIUnavailableError,
  PrescriptionExtraction,
} from "./types";

const BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "gemma4-e2b-q8-vision";

type Msg = { role: "system" | "user"; content: string; images?: string[] };

const safeJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// Ollama `format` takes a JSON schema and constrains decoding to it; Zod then re-validates.
async function chatJSON<T extends z.ZodType>(schema: T, messages: Msg[]): Promise<z.infer<T>> {
  const attempt = async (msgs: Msg[]) => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: msgs,
          stream: false,
          think: false,
          format: z.toJSONSchema(schema),
          options: { temperature: 0 },
        }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch {
      throw new LocalAIUnavailableError("Ollama unreachable");
    }
    if (!res.ok) throw new LocalAIUnavailableError(`Ollama ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  };

  let raw = await attempt(messages);
  let parsed = schema.safeParse(safeJson(raw));
  if (!parsed.success) {
    raw = await attempt([
      ...messages,
      { role: "user", content: `Your previous output was invalid (${parsed.error.message}). Return corrected JSON only.` },
    ]);
    parsed = schema.safeParse(safeJson(raw));
  }
  if (!parsed.success) throw new Error("Local model returned invalid JSON");
  return parsed.data;
}

const RX_SYSTEM = `You are extracting information from a photo of a prescription. Your job is NOT to diagnose.
Extract only information that is visible or explicitly stated. Never invent medication names, dosage, frequency, duration, or instructions.
If something is unclear or illegible: use null, add its path (e.g. "medications[0].name") to uncertainFields, and lower confidence (0-1).
"timing" lists times of day (e.g. "morning","evening","bedtime"); expand abbreviations only when written: BD/BID = morning + evening, TDS = morning + afternoon + evening.
Return valid JSON only.`;

export function analyzePrescriptionLocally(imageBase64: string) {
  return chatJSON(PrescriptionExtraction, [
    { role: "system", content: RX_SYSTEM },
    { role: "user", content: "Extract the prescription into the required JSON schema.", images: [imageBase64] },
  ]);
}

const CHECKIN_SYSTEM = `You extract what a patient explicitly reports in a daily check-in transcript. Do NOT diagnose and do NOT infer medical conditions.
Only record symptoms, missed doses and progress the person actually states. wellbeing is 1 (very poor) to 5 (very good) only if they convey it, else null.
Return valid JSON only.`;

export function analyzeCheckInLocally(transcript: string) {
  return chatJSON(CheckInExtraction, [
    { role: "system", content: CHECKIN_SYSTEM },
    { role: "user", content: `Transcript:\n"""${transcript}"""` },
  ]);
}

export async function ollamaHealth() {
  try {
    const r = await fetch(`${BASE}/api/show`, {
      method: "POST",
      body: JSON.stringify({ model: MODEL }),
      signal: AbortSignal.timeout(3000),
    });
    const j = (await r.json()) as { capabilities?: string[] };
    return { ok: r.ok, model: MODEL, vision: !!j.capabilities?.includes("vision") };
  } catch {
    return { ok: false, model: MODEL, vision: false };
  }
}
