"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteScan, listScans, type Scan } from "@/lib/scans";
import { getScope, KEYS, useLocal, writeLocal, type StoredCheckIn, type StoredRx } from "@/lib/store";

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [checkIns] = useLocal<StoredCheckIn[]>(KEYS.checkIns, []);
  const [current] = useLocal<StoredRx | null>(KEYS.rx, null);

  const load = useCallback(() => { listScans(getScope()).then(setScans); }, []);
  useEffect(() => {
    load();
    window.addEventListener("medilens:update", load);
    return () => window.removeEventListener("medilens:update", load);
  }, [load]);

  function open(s: Scan) {
    writeLocal(KEYS.rx, { extraction: s.extraction, explanation: s.explanation, payload: s.payload, demo: s.demo, at: s.at, scanId: s.id } satisfies StoredRx);
    router.push("/dashboard");
  }

  async function remove(s: Scan) {
    await deleteScan(s.id);
    if (current?.scanId === s.id) writeLocal(KEYS.rx, null);
    load();
  }

  const sortedCheckIns = [...checkIns].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:py-16">
      <p className="eyebrow">{user ? user.name : "Guest"}</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">History</h1>
      <p className="mt-3 max-w-xl text-muted">Every prescription photo you scanned and every check-in you made. Photos are stored in this browser only.</p>

      {!user && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
          <p>You&apos;re using MediLens as a guest. History stays on this device and is cleared if you clear browser data.</p>
          <Link href="/auth" className="rounded-lg bg-ink px-4 py-2 font-medium text-white">Create account</Link>
        </div>
      )}

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">Prescription scans</h2>
          {scans && <span className="text-xs text-muted">{scans.length} saved</span>}
        </div>

        {scans === null ? null : scans.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="font-serif text-2xl">No scans yet</p>
            <p className="mt-2 text-sm text-muted">Scanned prescriptions and their photos will be listed here.</p>
            <div className="mt-6 flex justify-center gap-3"><Button href="/scan">Scan prescription</Button><Button href="/demo" variant="secondary">Try demo</Button></div>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scans.map((s) => {
              const active = current?.scanId === s.id;
              return (
                <li key={s.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={`Prescription scanned ${new Date(s.at).toLocaleDateString()}`} className="aspect-[4/3] w-full border-b border-line object-cover object-top" />
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{new Date(s.at).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {s.demo && <Badge tone="warn">Demo</Badge>}
                      {active && <Badge tone="local">Current plan</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {s.extraction.medications.length} medication{s.extraction.medications.length === 1 ? "" : "s"}:{" "}
                      {s.extraction.medications.map((m) => m.name ?? "unclear").join(", ") || "none read"}
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                      <Button onClick={() => open(s)} className="!px-4 !py-2">Open plan</Button>
                      <button onClick={() => remove(s)} className="text-sm text-muted underline-offset-4 hover:text-red hover:underline" aria-label={`Delete scan from ${new Date(s.at).toLocaleDateString()}`}>Delete</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="eyebrow">Check-ins</h2>
        {sortedCheckIns.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No check-ins yet. <Link href="/check-in" className="underline underline-offset-4">Start a voice check-in</Link>.</p>
        ) : (
          <ol className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
            {sortedCheckIns.map((c) => (
              <li key={c.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[120px_1fr] sm:gap-6">
                <span className="text-sm text-muted">{new Date(c.at).toLocaleDateString("en", { day: "numeric", month: "short" })}{c.demo && " · demo"}</span>
                <div>
                  <p className="text-sm">{c.data.symptoms.map((s) => `${s.name} ${s.status}`).join(", ") || "No symptoms mentioned"}
                    {c.data.adherence.missedDoses.length > 0 && <span className="text-amber"> · {c.data.adherence.missedDoses.length} missed dose</span>}
                  </p>
                  <p className="mt-1 text-sm text-muted">“{c.transcript}”</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
