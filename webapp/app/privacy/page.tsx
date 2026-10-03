"use client";
import { AIPipeline } from "@/components/ai/ai-pipeline";
import { PrivacyPayload } from "@/components/ai/privacy-payload";
import { buildGeminiPayloadClient } from "@/lib/payload";
import { KEYS, useLocal, type StoredRx } from "@/lib/store";

const Row = ({ item, where, note, tone }: { item: string; where: string; note: string; tone: "local" | "cloud" }) => (
  <li className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8">
    <div>
      <p className="font-medium">{item}</p>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
    <p className={`text-sm font-medium ${tone === "local" ? "text-sage-ink" : "text-cloud"}`}>{tone === "local" ? "✓ " : "→ "}{where}</p>
  </li>
);

export default function PrivacyPage() {
  const [rx] = useLocal<StoredRx | null>(KEYS.rx, null);
  const sample = rx ? buildGeminiPayloadClient(rx.extraction) : {
    medications: [{ name: "Amoxicillin", strength: "500 mg", dosage: "1 tablet", frequency: "BD", timing: ["morning", "evening"], duration: "5 days" }],
    followUp: { required: true, afterDays: 5 },
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
      <div className="rounded-2xl bg-[#161715] p-8 text-white md:p-12">
        <p className="eyebrow !text-white/50">Privacy</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight md:text-6xl">Your data, by design.</h1>
        <p className="mt-4 max-w-xl text-lg text-white/70">We separate local understanding from cloud reasoning.</p>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-[1fr_1fr]">
        <div className="bg-sage-soft p-6">
          <p className="eyebrow !text-sage-ink">On this device</p>
          <p className="mt-2 font-serif text-2xl">Gemma 4</p>
          <p className="mt-2 text-sm text-sage-ink/80">Reads the prescription photo. Structures what you say in a check-in. Works with Wi-Fi off.</p>
        </div>
        <div className="bg-cloud-soft p-6">
          <p className="eyebrow !text-cloud">In the cloud, only when you ask</p>
          <p className="mt-2 font-serif text-2xl">Gemini</p>
          <p className="mt-2 text-sm text-cloud/90">Receives structured fields to write a plain-language explanation. Never an image, never audio.</p>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="eyebrow mb-4">The path your prescription takes</h2>
        <AIPipeline />
      </section>
      <section className="mt-10">
        <h2 className="eyebrow mb-4">The path your voice takes</h2>
        <AIPipeline variant="checkin" cloud={false} />
      </section>

      <section className="mt-14">
        <h2 className="eyebrow">What goes where</h2>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          <Row tone="local" item="Raw prescription image" where="Stays local" note="Read by Gemma 4 through Ollama on this machine. Not stored." />
          <Row tone="local" item="Raw voice recording" where="Stays local" note="Transcribed by Whisper inside your browser. Deleted when the page closes." />
          <Row tone="local" item="Your name" where="Stays local" note="Removed before anything is sent for explanation." />
          <Row tone="cloud" item="Structured prescription" where="To Gemini, on request" note="Medication names, doses, timing and instructions, so they can be explained in plain language." />
        </ul>
      </section>

      <section className="mt-12">
        <PrivacyPayload payload={sample} />
        <p className="mt-3 text-xs text-muted">
          {rx ? "This is the exact payload built from your scanned prescription." : "Example payload. Scan a prescription to see your own."} The Network tab will show nothing else leaving.
        </p>
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="eyebrow">If the cloud is unavailable</h2>
        <p className="mt-3 max-w-xl text-sm text-muted">
          MediLens still reads your prescription, shows your medication plan, records check-ins and tracks adherence.
          Only the plain-language explanation needs Gemini.
        </p>
      </section>
    </div>
  );
}
