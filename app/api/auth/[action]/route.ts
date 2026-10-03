import { z } from "zod";
import { AuthConfigError, createUser, currentUser, endSession, startSession, verifyUser } from "@/lib/auth";

const Signup = z.object({ name: z.string().trim().min(1).max(60), email: z.email().toLowerCase(), password: z.string().min(8).max(200) });
const Login = z.object({ email: z.email().toLowerCase(), password: z.string().min(1).max(200) });

type Ctx = { params: Promise<{ action: string }> };

export async function GET(_: Request, { params }: Ctx) {
  if ((await params).action !== "me") return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ user: await currentUser() });
}

export async function POST(req: Request, { params }: Ctx) {
  const { action } = await params;
  try {
    if (action === "logout") {
      await endSession();
      return Response.json({ ok: true });
    }
    const raw = await req.json().catch(() => null);
    if (action === "signup") {
      const b = Signup.safeParse(raw);
      if (!b.success) return Response.json({ error: "Enter your name, a valid email, and a password of at least 8 characters." }, { status: 400 });
      const user = await createUser(b.data.name, b.data.email, b.data.password);
      if (!user) return Response.json({ error: "An account with this email already exists." }, { status: 409 });
      await startSession(user);
      return Response.json({ user });
    }
    if (action === "login") {
      const b = Login.safeParse(raw);
      if (!b.success) return Response.json({ error: "Enter your email and password." }, { status: 400 });
      const user = await verifyUser(b.data.email, b.data.password);
      if (!user) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
      await startSession(user);
      return Response.json({ user });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    if (e instanceof AuthConfigError) return Response.json({ error: "Accounts are not configured on this server. Continue as guest." }, { status: 503 });
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
