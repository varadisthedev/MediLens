import { ollamaHealth } from "@/lib/ai/ollama";

export async function GET() {
  return Response.json({
    local: await ollamaHealth(),
    gemini: !!process.env.GEMINI_API_KEY,
    db: !!process.env.DATABASE_URL,
    email: !!process.env.RESEND_API_KEY,
  });
}
