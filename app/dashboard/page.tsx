"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Stepper } from "@/components/stepper";
import { AddMedicine } from "@/components/dashboard/add-medicine";
import { AdherenceCard } from "@/components/dashboard/adherence-card";
import { DaySchedule } from "@/components/dashboard/day-schedule";
import { SymptomChart } from "@/components/dashboard/symptom-chart";
import { DEMO_PATIENT } from "@/lib/demo";
import { courseDays, dosesFor, isoDay, patientName, type Dose } from "@/lib/schedule";
import { adhKey, KEYS, takenKey, useLocal, type AdherenceMap, type StoredCheckIn, type StoredRx, type TakenAtMap } from "@/lib/store";

type Med = StoredRx["extraction"]["medications"][number];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-line bg-surface p-5">
    <h2 className="eyebrow mb-4">{title}</h2>
    {children}
  </section>
);

export default function DashboardPage() {
  const [rx, setRx, ready] = useLocal<StoredRx | null>(KEYS.rx, null);
  const [checkIns] = useLocal<StoredCheckIn[]>(KEYS.checkIns, []);
  const [adherence, setAdherence] = useLocal<AdherenceMap>(adhKey(rx), {});
  const [takenAt, setTakenAt] = useLocal<TakenAtMap>(takenKey(rx), {});
  const [now] = useState(() => Date.now());
  const [adding, setAdding] = useState(false);
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
  const today = isoDay();
  const scheduled = doses.filter((d) => !d.asNeeded);
  const takenToday = scheduled.filter((d) => adherence[`${today}|${d.key}`] === "taken").length;
  const name = patientName(rx.extraction.patient.name) ?? (rx.demo ? DEMO_PATIENT : null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const sorted = [...checkIns].sort((a, b) => b.at.localeCompare(a.at));
  const latest = sorted[0];
  const f = rx.extraction.followUp;
  const followDays = f.required && f.afterDays != null ? Math.ceil((new Date(rx.at).getTime() + f.afterDays * 86400000 - now) / 86400000) : null;
  const courses = rx.extraction.medications
    .map((m, i) => ({ m, i, total: courseDays(m.duration) }))
    .filter((c): c is { m: Med; i: number; total: number } => c.total != null && !!c.m.name);

  function toggle(d: Dose) {
    const k = `${today}|${d.key}`;
    const a = { ...adherence }, t = { ...takenAt };
    if (a[k] === "taken") { delete a[k]; delete t[k]; } else { a[k] = "taken"; t[k] = new Date().toISOString(); }
    setAdherence(a);
    setTakenAt(t);
  }

  function addMedicine(m: Med) {
    setRx({ ...rx!, extraction: { ...rx!.extraction, medications: [...rx!.extraction.medications, m] } });
    setAdding(false);
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
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <Stepper current={4} />

      <div className="mt-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Daily schedule{rx.demo && " · Demo patient"}</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">{new Date().toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}</h1>
          <p className="mt-2 text-muted">{greeting}{name ? `, ${name}` : ""}. Your treatment plan at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
            <span className="text-muted">Progress:</span>
            <span className="font-medium">{takenToday} of {scheduled.length} taken</span>
            <div className="w-16"><Progress value={takenToday} max={scheduled.length || 1} label="Doses taken today" /></div>
          </div>
          <Button onClick={() => setAdding(true)}>＋ Add medicine</Button>
        </div>
      </div>
      <p className="mt-1 min-h-5 text-xs text-muted" role="status">{toast}</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {adding && <AddMedicine onAdd={addMedicine} onClose={() => setAdding(false)} />}
          <DaySchedule doses={doses} adherence={adherence} takenAt={takenAt} onToggle={toggle} onRemind={remind} />
        </div>

        <div className="space-y-5">
          <Section title="Adherence"><AdherenceCard adherence={adherence} /></Section>

          {courses.length > 0 && (
            <Section title="Course progress">
              <ul className="space-y-4">
                {courses.map(({ m, i, total }) => {
                  const day = Math.min(total, Math.max(1, Math.floor((now - new Date(rx.at).getTime()) / 86400000) + 1));
                  return (
                    <li key={i}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted">Day {day} of {total}</span>
                      </div>
                      <Progress value={day} max={total} label={`${m.name} course`} />
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

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

          <Section title="Upcoming">
            {f.required ? (
              <div>
                <p className="font-serif text-2xl">Follow-up{followDays != null ? (followDays > 0 ? ` in ${followDays} days` : " is due") : ""}</p>
                {f.notes && <p className="mt-2 text-sm text-muted">{f.notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted">No follow-up was written on this prescription.</p>
            )}
            <div className="mt-4 flex gap-4 text-sm">
              <Link className="underline underline-offset-4" href="/prescription">Review prescription</Link>
              <Link className="underline underline-offset-4" href="/history">History</Link>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
