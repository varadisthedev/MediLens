"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setScope } from "@/lib/store";

type User = { id: string; name: string; email: string };
type Ctx = {
  user: User | null;
  guest: boolean;
  signIn: (mode: "login" | "signup", body: Record<string, string>) => Promise<string | null>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};

const MODE_KEY = "medilens.mode";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [chosen, setChosen] = useState<boolean>(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const path = usePathname();

  const apply = useCallback((u: User | null) => {
    setScope(u ? u.id : "guest");
    setUser(u);
    window.dispatchEvent(new Event("medilens:update"));
  }, []);

  useEffect(() => {
    let guest = false;
    try { guest = localStorage.getItem(MODE_KEY) === "guest"; } catch {}
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j: { user: User | null }) => {
        apply(j.user);
        setChosen(!!j.user || guest);
      })
      .catch(() => { apply(null); setChosen(guest); })
      .finally(() => setReady(true));
  }, [apply]);

  // First-time visitors pick an identity (account or guest) before using the app.
  useEffect(() => {
    if (ready && !chosen && path !== "/auth") router.replace("/auth");
  }, [ready, chosen, path, router]);

  const signIn: Ctx["signIn"] = async (mode, body) => {
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res) return "Could not reach the server.";
    const j = await res.json();
    if (!res.ok) return j.error as string;
    apply(j.user);
    setChosen(true);
    return null;
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    try { localStorage.removeItem(MODE_KEY); } catch {}
    apply(null);
    setChosen(false);
    router.replace("/auth");
  };

  const continueAsGuest = () => {
    try { localStorage.setItem(MODE_KEY, "guest"); } catch {}
    apply(null);
    setChosen(true);
    router.push("/");
  };

  if (!ready) return null;
  return <AuthCtx.Provider value={{ user, guest: !user, signIn, signOut, continueAsGuest }}>{children}</AuthCtx.Provider>;
}
