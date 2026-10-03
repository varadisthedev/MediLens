import { SignJWT, jwtVerify } from "jose";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";

// Stateless JWT auth. Credentials live in a local JSON file (prototype); scan images never reach the server.
// ponytail: file store has no locking; swap for the Neon `users` table when real accounts matter.
const FILE = path.join(process.cwd(), "data", "users.json");
const COOKIE = "medilens_token";
const WEEK = 60 * 60 * 24 * 7;

type StoredUser = { id: string; email: string; name: string; hash: string };
export type PublicUser = { id: string; email: string; name: string };

export class AuthConfigError extends Error {}

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new AuthConfigError("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
};

const readUsers = async (): Promise<StoredUser[]> => {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as StoredUser[];
  } catch {
    return [];
  }
};

const hashPw = (pw: string) => {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`;
};

const checkPw = (pw: string, stored: string) => {
  const [salt, hash] = stored.split(":");
  const a = scryptSync(pw, Buffer.from(salt, "hex"), 64);
  return timingSafeEqual(a, Buffer.from(hash, "hex"));
};

const pub = ({ id, email, name }: StoredUser): PublicUser => ({ id, email, name });

export async function createUser(name: string, email: string, password: string) {
  secret();
  const users = await readUsers();
  if (users.some((u) => u.email === email)) return null;
  const user: StoredUser = { id: randomUUID(), email, name, hash: hashPw(password) };
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify([...users, user], null, 2));
  return pub(user);
}

export async function verifyUser(email: string, password: string) {
  secret();
  const u = (await readUsers()).find((x) => x.email === email);
  return u && checkPw(password, u.hash) ? pub(u) : null;
}

export async function startSession(user: PublicUser) {
  const token = await new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(`${WEEK}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: WEEK, secure: process.env.NODE_ENV === "production" });
}

export const endSession = async () => (await cookies()).delete(COOKIE);

export async function currentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: String(payload.sub), name: String(payload.name), email: String(payload.email) };
  } catch {
    return null;
  }
}
