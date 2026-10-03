import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-14 px-5 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="eyebrow">MediLens</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
            Understand your prescription.
            <br />
            <em className="text-sage-ink">Privately.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
            Turn a prescription into a clear medication plan, reminders, and daily check-ins — with sensitive information processed locally first.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button href="/scan">Scan prescription</Button>
            <Button href="/check-in" variant="secondary">Try a voice check-in</Button>
          </div>
          <p className="mt-6 text-sm text-muted">
            No account needed. <a href="/demo" className="underline underline-offset-4 hover:text-ink">Open the demo</a> to see it with a sample prescription.
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <Badge tone="local">● Local AI · Gemma 4</Badge>
            <span className="text-xs text-muted">on this device</span>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-2">
            <div className="relative aspect-[3/4] bg-surface">
              <Image src="/demo/prescription.jpg" alt="Sample prescription" fill sizes="(min-width: 1024px) 220px, 50vw" className="object-cover object-top" priority />
              <div className="scan-line" aria-hidden />
            </div>
            <div className="bg-surface p-5 font-mono text-[11px] leading-relaxed text-ink/80">
              <p className="text-muted">structured output</p>
              <p className="mt-2">{"{"}</p>
              <p className="pl-3">&quot;name&quot;: &quot;Amoxicillin&quot;,</p>
              <p className="pl-3">&quot;strength&quot;: &quot;500 mg&quot;,</p>
              <p className="pl-3">&quot;timing&quot;: [</p>
              <p className="pl-6">&quot;morning&quot;, &quot;evening&quot;</p>
              <p className="pl-3">],</p>
              <p className="pl-3">&quot;duration&quot;: &quot;5 days&quot;</p>
              <p>{"}"}</p>
            </div>
          </div>
          <div className="space-y-1 border-t border-line px-5 py-4 text-sm">
            <p>Your prescription is understood on-device before anything is sent for deeper reasoning.</p>
            <p className="pt-2 text-xs tracking-wide">
              <span className="font-medium text-sage-ink">LOCAL ✓</span>
              <span className="mx-3 text-line">|</span>
              <span className="text-cloud">CLOUD ONLY WHEN NEEDED</span>
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
          {[
            ["Read locally", "Gemma 4 reads your prescription photo and listens to your check-ins on your own machine."],
            ["Explained when needed", "Only structured fields — never the photo or audio — go to Gemini for a plain-language explanation."],
            ["Useful offline", "If the cloud is down, your medication plan and check-ins still work."],
          ].map(([t, d]) => (
            <div key={t}>
              <h2 className="font-serif text-2xl">{t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mx-auto max-w-6xl px-5 py-10 text-xs text-muted">
        MediLens helps you understand and organize what your clinician prescribed. It does not diagnose, prescribe, or change your treatment.
      </p>
    </>
  );
}
