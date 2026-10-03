"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TodayPlan } from "@/components/dashboard/today-plan";
import { AdherenceCard } from "@/components/dashboard/adherence-card";
import { SymptomChart } from "@/components/dashboard/symptom-chart";
import { DEMO_PATIENT } from "@/lib/demo";
import { dosesFor, isoDay, type Dose } from "@/lib/schedule";
import { KEYS, useLocal, type AdherenceMap, type StoredCheckIn, type StoredRx } from "@/lib/store";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-t border-line pt-6">
    <h2 className="eyebrow mb-4">{title}</h2>
    {children}
  </section>
);

export default function DashboardPage() {
  const [rx, , ready] = useLocal<StoredRx | null>(KEYS.rx, null);
  const [checkIns] = useLocal<StoredCheckIn[]>(KEYS.checkIns, []);
  const [adherence, setAdherence] = useLocal<AdherenceMap>(KEYS.adherence, {});
  const [toast, setToast] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ summary: string; thingsToMention: string[] } | string | null>(null);

  if (!ready) return null;
  if (!rx)
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-serif text-3xl">Your plan will appear here</h1>
        <p className="mt-3 text-muted">Scan a prescription and MediLens will build today&apos;s medication plan from it.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/scan">Scan prescription</Button>
          <Button href="/demo" variant="secondary">Open demo</Button>
        </div>
      </div>
    );

  const doses = dosesFor(rx.extraction);
  const name = rx.extraction.patient.name ?? (rx.demo ? DEMO_PATIENT : null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const sorted = [...checkIns].sort((a, b) => b.at.localeCompare(a.at));
  const latest = sorted[0];
  const f = rx.extraction.followUp;
  const followDays = f.required && f.afterDays != null ? Math.ceil((new Date(rx.at).getTime() + f.afterDays * 86400000 - Date.now()) / 86400000) : null;

  function mark(key: string, status: "taken" | "missed" | null) {
    const next = { ...adherence };
    const k = `${isoDay()}|${key}`;
    if (status) next[k] = status;
    else delete next[k];
    setAdherence(next);
  }

  async function remind(d: Dose) {
    setToast("Sending reminder…");
    const res = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: d.name, detail: d.detail, time: d.time }) });
    setToast(res.ok ? "Reminder email sent." : (await res.json()).error);
    setTimeout(() => setToast(null), 4000);
  }

  async function summarize() {
    setProgress("Gemini is summarizing your check-ins…");
    const res = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkIns: sorted.map(({ at, data }) => ({ at, data })) }) });
    const j = await res.json();
    setProgress(res.ok ? j.progress : j.error);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:py-16">
      <p className="eyebrow">{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}{rx.demo && " · Demo patient"}</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">{greeting}{name ? `, ${name}` : ""}.</h1>
      <p className="mt-3 text-muted">Your treatment plan at a glance.</p>

      <div className="mt-10 grid gap-x-16 gap-y-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          <Section title="Today">
            <TodayPlan doses={doses} adherence={adherence} onMark={mark} onRemind={remind} />
            <p className="mt-3 min-h-5 text-xs text-muted" role="status">{toast}</p>
          </Section>

          <Section title="Check-in">
            <p className="font-serif text-2xl">How are you feeling today?</p>
            {latest && (
              <p className="mt-2 text-sm text-muted">
                Last check-in {new Date(latest.at).toLocaleDateString("en", { month: "short", day: "numeric" })}:{" "}
                {latest.data.symptoms.map((s) => `${s.name} ${s.status}`).join(", ") || "no symptoms reported"}.
              </p>
            )}
            <div className="mt-5"><Button href="/check-in">Start voice check-in</Button></div>
          </Section>

          <Section title="Well-being, as you reported it">
            <SymptomChart checkIns={checkIns} />
            {sorted.length > 0 && (
              <div className="mt-4">
                {progress ? (
                  typeof progress === "string" ? <p className="text-sm text-muted" role="status">{progress}</p> : (
                    <div className="rise space-y-2 text-sm">
                      <p>{progress.summary}</p>
                      <ul className="list-disc pl-5 text-muted">{progress.thingsToMention.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </div>
                  )
                ) : (
                  <button onClick={summarize} className="text-sm underline underline-offset-4 hover:text-sage-ink">Summarize my progress with Gemini</button>
                )}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-10">
          <Section title="Adherence"><AdherenceCard adherence={adherence} /></Section>
          <Section title="Upcoming">
            {f.required ? (
              <div>
                <p className="font-serif text-2xl">Follow-up{followDays != null ? (followDays > 0 ? ` in ${followDays} days` : " is due") : ""}</p>
                {f.notes && <p className="mt-2 text-sm text-muted">{f.notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted">No follow-up was written on this prescription.</p>
            )}
          </Section>
          <Section title="Prescription">
            <p className="text-sm text-muted">{rx.extraction.medications.length} medications, read locally by Gemma 4.</p>
            <div className="mt-3 flex gap-4 text-sm">
              <a className="underline underline-offset-4" href="/prescription">Review</a>
              <a className="underline underline-offset-4" href="/privacy">Privacy</a>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
