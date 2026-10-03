import { z } from "zod";
import { analyzeCheckInLocally } from "@/lib/ai/ollama";
import { LocalAIUnavailableError } from "@/lib/ai/types";

export const maxDuration = 120;

const Body = z.object({ transcript: z.string().min(3).max(4000) });

// Receives only the transcript. Raw audio never reaches the server.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Transcript is empty" }, { status: 400 });
  try {
    return Response.json({ result: await analyzeCheckInLocally(body.data.transcript) });
  } catch (e) {
    if (e instanceof LocalAIUnavailableError)
      return Response.json({ code: e.code, error: "Local AI is unavailable. Check that Ollama is running." }, { status: 503 });
    return Response.json({ error: "Could not understand this check-in. Try again." }, { status: 422 });
  }
}
