"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

const field = "mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm";

export default function AuthPage() {
  const { signIn, continueAsGuest, user, signOut } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setError(await signIn(mode, f));
    setBusy(false);
    if (!error) router.push("/");
  }

  if (user)
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-serif text-3xl">Signed in as {user.name}</h1>
        <p className="mt-2 text-sm text-muted">{user.email}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/history">Open history</Button>
          <Button variant="secondary" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-5 py-14 md:grid-cols-2 md:py-24">
      <div>
        <p className="eyebrow">MediLens</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight md:text-5xl">Your prescriptions, kept private.</h1>
        <ol className="mt-8 space-y-4 text-sm text-muted">
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs text-white">1</span>Scan a prescription. Gemma 4 reads it on this device.</li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs text-white">2</span>Photos and history stay in this browser, never on a server.</li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs text-white">3</span>An account keeps each person&apos;s history separate. Guests get history too.</li>
        </ol>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 md:p-8">
        <div className="grid grid-cols-2 rounded-lg bg-bg p-1 text-sm" role="tablist">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }}
              className={`rounded-md py-2 font-medium ${mode === m ? "bg-ink text-white" : "text-muted"}`}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && <label className="block text-sm">Name<input name="name" required autoComplete="name" className={field} /></label>}
          <label className="block text-sm">Email<input name="email" type="email" required autoComplete="email" className={field} /></label>
          <label className="block text-sm">Password<input name="password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} className={field} />
            {mode === "signup" && <span className="mt-1 block text-xs text-muted">At least 8 characters.</span>}
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-soft px-3 py-2 text-sm text-red">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <Button variant="secondary" onClick={continueAsGuest} className="w-full">Continue as guest</Button>
        <p className="mt-3 text-center text-xs text-muted">No sign-up needed. Guest history is kept on this device.</p>
      </div>
    </div>
  );
}
