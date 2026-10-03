import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { buildGeminiPayloadClient } from "../payload";
import { Explanation } from "./types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

export class CloudUnavailableError extends Error {}

const GUARDRAILS = `You help a patient UNDERSTAND and ORGANIZE what their clinician already prescribed.
The input is structured information extracted locally from a prescription. It may contain nulls and uncertainFields.
Rules:
- Do not invent missing information. If a field is null or uncertain, say it is unclear and to verify with the doctor or pharmacist.
- Never modify prescribed doses. Never diagnose. Never recommend starting, stopping or changing any medication.
- Phrase things as "Your prescription indicates..." never "AI recommends...".
- Explain medical terms in plain language. Keep information from the prescription separate from general educational notes.
- For concerning symptoms use: "If symptoms are worsening or you are concerned, contact your clinician or seek appropriate medical care."
- Questions for the clinician must be questions only, not advice.`;

/** GEMINI_API_KEY, then GEMINI_API_KEY_2..4: later keys are only used when earlier ones are missing or rejected. */
export const geminiKeys = () =>
  ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4"].map((n) => process.env[n]?.trim()).filter((k): k is string => !!k);

// Errors that mean "this key can't serve the request" (bad key, no access, quota), so try the next key.
const KEY_PROBLEM = /"code":\s*(400|401|403|429)|API_KEY_INVALID|PERMISSION_DENIED|RESOURCE_EXHAUSTED/;
const TRANSIENT = /"code":\s*503/;

async function generate<T extends z.ZodType>(schema: T, prompt: string): Promise<z.infer<T>> {
  const keys = geminiKeys();
  if (!keys.length) throw new CloudUnavailableError("No Gemini API key is set");
  const config = {
    systemInstruction: GUARDRAILS,
    responseMimeType: "application/json",
    responseJsonSchema: z.toJSONSchema(schema),
    temperature: 0.2,
  };

  for (const [i, apiKey] of keys.entries()) {
    const ai = new GoogleGenAI({ apiKey });
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await ai.models.generateContent({ model: MODEL, contents: prompt, config });
        return schema.parse(JSON.parse(res.text ?? ""));
      } catch (e) {
        const msg = String(e);
        // Gemini returns transient 503s under load: retry the same key briefly.
        if (TRANSIENT.test(msg) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        console.error(`[gemini] key ${i + 1}/${keys.length}:`, msg.slice(0, 300));
        if (KEY_PROBLEM.test(msg) && i < keys.length - 1) break; // next key
        throw new CloudUnavailableError("Gemini request failed");
      }
    }
  }
  throw new CloudUnavailableError("Gemini request failed");
}

export { buildGeminiPayloadClient as buildGeminiPayload } from "../payload";

export function explainPrescription(payload: ReturnType<typeof buildGeminiPayloadClient>) {
  return generate(
    Explanation,
    `Explain this prescription for the patient. Fill: glance (2 sentences), whatItSays, a daily schedule (time of day, medication, detail), follow-up, things to remember, medical terms explained, and questions to ask the clinician.\n\n${JSON.stringify(payload, null, 2)}`,
  );
}

const Progress = z.object({ summary: z.string(), thingsToMention: z.array(z.string()) });

export function summarizeCheckIns(history: unknown) {
  return generate(
    Progress,
    `These are structured, user-reported check-ins (not clinical measurements). Write a concise, neutral progress summary and a short list of things the patient may want to mention to their clinician. Do not diagnose.\n\n${JSON.stringify(history)}`,
  );
}
