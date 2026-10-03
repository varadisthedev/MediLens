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

function client() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new CloudUnavailableError("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey: key });
}

async function generate<T extends z.ZodType>(schema: T, prompt: string): Promise<z.infer<T>> {
  const call = () =>
    client().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: GUARDRAILS,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(schema),
        temperature: 0.2,
      },
    });
  try {
    let res;
    // Gemini returns transient 503s under load; one retry is enough for a demo.
    for (let attempt = 0; ; attempt++) {
      try {
        res = await call();
        break;
      } catch (e) {
        if (attempt >= 2 || !/"code":\s*(503|429)/.test(String(e))) throw e;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    return schema.parse(JSON.parse(res.text ?? ""));
  } catch (e) {
    console.error("[gemini]", e instanceof Error ? e.message.slice(0, 500) : e);
    throw e instanceof CloudUnavailableError ? e : new CloudUnavailableError("Gemini request failed");
  }
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
