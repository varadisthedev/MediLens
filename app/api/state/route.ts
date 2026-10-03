import { z } from "zod";
import { db, schema } from "@/lib/db";
import { CheckInExtraction, Explanation, PrescriptionExtraction } from "@/lib/ai/types";

// Best-effort persistence to Neon. The app works from browser storage when DATABASE_URL is unset.
const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("prescription"), extraction: PrescriptionExtraction, explanation: Explanation.nullable(), patientName: z.string() }),
  z.object({ kind: z.literal("checkin"), transcript: z.string(), data: CheckInExtraction, patientName: z.string() }),
]);

async function patientId(name: string) {
  if (!db) throw new Error("no db");
  const [existing] = await db.select().from(schema.patients).limit(1);
  if (existing) return existing.id;
  const [p] = await db.insert(schema.patients).values({ name }).returning();
  return p.id;
}

export async function POST(req: Request) {
  if (!db) return Response.json({ saved: false });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  try {
    const pid = await patientId(body.data.patientName);
    if (body.data.kind === "prescription") {
      const { extraction, explanation } = body.data;
      const [rx] = await db
        .insert(schema.prescriptions)
        .values({ patientId: pid, prescriptionDate: extraction.prescriptionDate, gemmaResult: extraction, geminiSummary: explanation })
        .returning();
      if (extraction.medications.length)
        await db.insert(schema.medications).values(extraction.medications.map((m) => ({ ...m, prescriptionId: rx.id })));
    } else {
      await db.insert(schema.checkIns).values({ patientId: pid, transcript: body.data.transcript, structuredData: body.data.data });
    }
    return Response.json({ saved: true });
  } catch {
    return Response.json({ saved: false, error: "Database unavailable" }, { status: 503 });
  }
}
