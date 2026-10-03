import { z } from "zod";
import { CheckInExtraction } from "@/lib/ai/types";
import { summarizeCheckIns } from "@/lib/ai/gemini";

const Body = z.object({ checkIns: z.array(z.object({ at: z.string(), data: CheckInExtraction })).min(1) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "No check-ins" }, { status: 400 });
  try {
    return Response.json({ progress: await summarizeCheckIns(body.data.checkIns) });
  } catch {
    return Response.json({ error: "Cloud summary is temporarily unavailable." }, { status: 503 });
  }
}
