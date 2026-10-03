import { z } from "zod";
import { sendMedicationReminder } from "@/lib/email/resend";

const Body = z.object({ name: z.string(), detail: z.string(), time: z.string() });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid reminder" }, { status: 400 });
  try {
    const r = await sendMedicationReminder(body.data);
    if (r.error) throw new Error(r.error.message);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Email is not configured or could not be sent." }, { status: 503 });
  }
}
