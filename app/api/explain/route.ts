import { PrescriptionExtraction } from "@/lib/ai/types";
import { buildGeminiPayload, CloudUnavailableError, explainPrescription } from "@/lib/ai/gemini";

export async function POST(req: Request) {
  const rx = PrescriptionExtraction.safeParse(await req.json().catch(() => null));
  if (!rx.success) return Response.json({ error: "Invalid prescription data" }, { status: 400 });
  const payload = buildGeminiPayload(rx.data);
  try {
    return Response.json({ explanation: await explainPrescription(payload), payload });
  } catch (e) {
    const code = e instanceof CloudUnavailableError ? "CLOUD_UNAVAILABLE" : "ERROR";
    return Response.json({ code, error: "Cloud explanation is temporarily unavailable.", payload }, { status: 503 });
  }
}
