"use client";
import { useEffect, useState } from "react";
import { AIPipeline, CloudBadge, LocalBadge } from "@/components/ai/ai-pipeline";
import { PrivacyPayload } from "@/components/ai/privacy-payload";
import { MedicationRow } from "@/components/prescription/medication-row";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/stepper";
import { getScan, putScan } from "@/lib/scans";
import { Explanation } from "@/lib/ai/types";
import { KEYS, mirrorToDb, useLocal, type StoredRx } from "@/lib/store";
import { DEMO_PATIENT } from "@/lib/demo";
import { patientName } from "@/lib/schedule";

export default function PrescriptionPage() {
  const [rx, setRx, ready] = useLocal<StoredRx | null>(KEYS.rx, null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  const scanId = rx?.scanId;
  useEffect(() => {
    if (scanId) getScan(scanId).then((sc) => setImage(sc?.image ?? null));
  }, [scanId]);

  if (!ready) return null;
  if (!rx)
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-serif text-3xl">No prescription yet</h1>
        <p className="mt-3 text-muted">Scan a prescription to see what Gemma 4 reads from it.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/scan">Scan prescription</Button>
          <Button href="/demo" variant="secondary">Open demo</Button>
        </div>
      </div>
    );

  const { extraction: e, explanation: ex } = rx;
  const uncertainCount = e.medications.filter((m) => m.uncertainFields.length > 0 || !m.name).length + e.uncertainFields.length;

  async function explain() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) });
      const j = await res.json();
      if (!res.ok) {
        setRx({ ...rx!, payload: j.payload ?? rx!.payload });
        setError(j.error ?? "Cloud explanation is temporarily unavailable.");
      } else {
        const explanation = Explanation.parse(j.explanation);
        const next = { ...rx!, explanation, payload: j.payload };
        setRx(next);
        if (scanId) getScan(scanId).then((sc) => sc && putScan({ ...sc, explanation, payload: j.payload }));
        mirrorToDb({ kind: "prescription", extraction: e, explanation, patientName: patientName(e.patient.name) ?? DEMO_PATIENT });
      }
    } catch {
      setError("Cloud explanation is temporarily unavailable.");
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
      <Stepper current={ex ? 3 : 2} />
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <LocalBadge />
        {rx.demo && <span className="eyebrow">Demo prescription</span>}
      </div>
      <h1 className="mt-4 font-serif text-4xl tracking-tight md:text-5xl">Prescription</h1>
      <p className="mt-3 text-muted">Review the information extracted on your device.</p>

      {image && (
        <figure className="mt-8 flex items-center gap-4 rounded-xl border border-line bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Your saved prescription photo" className="h-24 w-20 rounded-md border border-line object-cover object-top" />
          <figcaption className="text-sm"><span className="font-medium">Original photo</span><br /><span className="text-muted">Saved in your history on this device only. <a href="/history" className="underline underline-offset-4">View history</a></span></figcaption>
        </figure>
      )}

      {uncertainCount > 0 && (
        <p className="mt-6 rounded-md border border-amber/30 bg-amber-soft p-4 text-sm text-amber">
          Some parts were hard to read and are marked below. Please verify them with your doctor or pharmacist.
        </p>
      )}

      <dl className="mt-10 grid grid-cols-2 gap-6 border-y border-line py-5 sm:grid-cols-3">
        <div><dt className="eyebrow">Patient</dt><dd className="mt-1 text-sm">{patientName(e.patient.name) ?? "Not stated"}</dd></div>
        <div><dt className="eyebrow">Date</dt><dd className="mt-1 text-sm">{e.prescriptionDate ?? "Not stated"}</dd></div>
        <div><dt className="eyebrow">Overall confidence</dt><dd className="mt-1 text-sm">{Math.round(e.overallConfidence * 100)}%</dd></div>
      </dl>

      {e.medications.length === 0 ? (
        <p className="py-10 text-muted">No medications could be read from this image. Try a clearer photo.</p>
      ) : (
        <ul className="divide-y divide-line">
          {e.medications.map((m, i) => <MedicationRow key={i} med={m} index={i} />)}
        </ul>
      )}

      {(e.instructions.length > 0 || e.followUp.required) && (
        <section className="mt-6 border-t border-line pt-8">
          <h2 className="eyebrow">Instructions on the prescription</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {e.instructions.map((t, i) => <li key={i}>{t}</li>)}
            {e.followUp.required && (
              <li>Follow-up{e.followUp.afterDays != null ? ` after ${e.followUp.afterDays} days` : ""}{e.followUp.notes ? `: ${e.followUp.notes}` : ""}</li>
            )}
          </ul>
        </section>
      )}

      <section id="explanation" className="mt-14 border-t border-line pt-10">
        <p className="eyebrow">Next</p>
        <h2 className="mt-2 font-serif text-3xl">Explanation</h2>
        <div className="mt-6"><AIPipeline /></div>

        {!ex && (
          <div className="mt-8">
            <p className="max-w-xl text-sm text-muted">
              Only the structured fields above are sent to Gemini. Your photo and your name stay on this device.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={explain} disabled={loading || e.medications.length === 0}>
                {loading ? "Gemini is writing your explanation…" : "Continue to explanation"}
              </Button>
              <Button href="/dashboard" variant="secondary">Skip to my plan</Button>
            </div>
            {error && (
              <p role="alert" className="mt-5 rounded-md border border-line bg-surface p-4 text-sm">
                <strong className="font-medium">{error}</strong> Your locally extracted prescription above is still available.
              </p>
            )}
          </div>
        )}

        {ex && (
          <div className="rise mt-12 space-y-12">
            <div className="flex items-center gap-2"><CloudBadge /><span className="text-xs text-muted">Written by Gemini from the structured data only</span></div>
            <div>
              <h3 className="eyebrow">Your prescription at a glance</h3>
              <p className="mt-3 font-serif text-2xl leading-snug">{ex.glance}</p>
            </div>
            <div>
              <h3 className="eyebrow">What this prescription says</h3>
              <p className="mt-3 leading-relaxed">{ex.whatItSays}</p>
            </div>
            <div>
              <h3 className="eyebrow">Medication schedule</h3>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {ex.schedule.map((s, i) => (
                  <li key={i} className="grid grid-cols-[88px_1fr] gap-4 py-3 text-sm">
                    <span className="font-mono text-muted">{s.time}</span>
                    <span><span className="font-medium">{s.medication}</span><span className="text-muted"> — {s.detail}</span></span>
                  </li>
                ))}
              </ul>
            </div>
            <div><h3 className="eyebrow">Follow-up</h3><p className="mt-3">{ex.followUp}</p></div>
            <div>
              <h3 className="eyebrow">Things to remember</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{ex.remember.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
            {ex.terms.length > 0 && (
              <div>
                <h3 className="eyebrow">Terms explained</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  {ex.terms.map((t, i) => <div key={i}><dt className="font-medium">{t.term}</dt><dd className="text-muted">{t.meaning}</dd></div>)}
                </dl>
              </div>
            )}
            <div>
              <h3 className="eyebrow">Questions you may want to ask your clinician</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{ex.questionsForClinician.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
            <PrivacyPayload payload={rx.payload} />
            <div className="flex flex-wrap gap-3 border-t border-line pt-8">
              <Button href="/dashboard">Go to my plan</Button>
              <Button href="/privacy" variant="secondary">See what was shared</Button>
            </div>
            <p className="text-xs text-muted">MediLens does not diagnose or change your treatment. If symptoms are worsening or you are concerned, contact your clinician or seek appropriate medical care.</p>
          </div>
        )}
      </section>
    </div>
  );
}
