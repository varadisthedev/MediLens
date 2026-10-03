import { geminiKeys } from "@/lib/ai/gemini";
import { ollamaHealth } from "@/lib/ai/ollama";

export async function GET() {
  return Response.json({
    local: await ollamaHealth(),
    gemini: geminiKeys().length,
    db: !!process.env.DATABASE_URL,
    email: !!process.env.RESEND_API_KEY,
  });
}
