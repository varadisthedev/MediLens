"use client";
import { useEffect, useState } from "react";
import { PrescriptionScanner } from "@/components/prescription/prescription-scanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_IMAGE, demoAdherence, demoCheckIns } from "@/lib/demo";
import { dosesFor } from "@/lib/schedule";
import { adhKey, KEYS, readLocal, writeLocal, type StoredRx } from "@/lib/store";

export default function DemoPage() {
  const [seeded, setSeeded] = useState(false);
  const [hasRx, setHasRx] = useState(false);

  useEffect(() => {
    const sync = () => setHasRx(!!readLocal<StoredRx | null>(KEYS.rx, null));
    sync();
    window.addEventListener("medilens:update", sync);
    return () => window.removeEventListener("medilens:update", sync);
  }, []);

  function seed() {
    const rx = readLocal<StoredRx | null>(KEYS.rx, null);
    if (!rx) return;
    writeLocal(KEYS.checkIns, demoCheckIns());
    writeLocal(adhKey(rx), demoAdherence(dosesFor(rx.extraction)));
    setSeeded(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <div className="flex items-center gap-3"><Badge tone="warn">Demo patient</Badge><Badge tone="neutral">Demo prescription</Badge></div>
      <h1 className="mt-4 font-serif text-4xl tracking-tight md:text-5xl">Try MediLens with a sample</h1>
      <p className="mt-3 max-w-2xl text-muted">
        The sample prescription below is fictional. It runs through the real pipeline: Gemma 4 reads it locally, then Gemini explains the structured result.
        Nothing here is pre-recorded.
      </p>

      <ol className="mt-10 grid gap-6 border-y border-line py-6 text-sm sm:grid-cols-3">
        <li><span className="eyebrow">1</span><p className="mt-1">Analyze the sample prescription</p></li>
        <li><span className="eyebrow">2</span><p className="mt-1">Review, then continue to the explanation</p></li>
        <li><span className="eyebrow">3</span><p className="mt-1">Add demo check-in history, then open your plan</p></li>
      </ol>

      <div className="mt-12"><PrescriptionScanner demoImage={DEMO_IMAGE} demoLabel="Analyze sample prescription" /></div>

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="eyebrow">Demo check-in history</h2>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Adds five days of labelled, example check-ins and dose records so the dashboard shows adherence and a well-being trend. Needs a scanned prescription first.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={seed} disabled={!hasRx}>{seeded ? "Demo history added" : "Add demo history"}</Button>
          <Button href="/dashboard" variant="secondary" disabled={!hasRx}>Open dashboard</Button>
          <Button href="/check-in" variant="secondary">Try a voice check-in</Button>
          <Button href="/privacy" variant="secondary">See the privacy pipeline</Button>
        </div>
      </section>
    </div>
  );
}
