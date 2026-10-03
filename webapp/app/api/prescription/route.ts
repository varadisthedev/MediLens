import { z } from "zod";
import { analyzePrescriptionLocally } from "@/lib/ai/ollama";
import { LocalAIUnavailableError } from "@/lib/ai/types";

export const maxDuration = 300;

const Body = z.object({ image: z.string().min(100) }); // base64 JPEG/PNG

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid image" }, { status: 400 });
  try {
    const t0 = Date.now();
    const result = await analyzePrescriptionLocally(body.data.image.replace(/^data:.*?;base64,/, ""));
    return Response.json({ result, ms: Date.now() - t0 });
  } catch (e) {
    if (e instanceof LocalAIUnavailableError)
      return Response.json({ code: e.code, error: "Local AI is unavailable. Check that Ollama is running." }, { status: 503 });
    return Response.json({ error: "Could not read this prescription. Try a clearer photo." }, { status: 422 });
  }
}
