"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KEYS, writeLocal, type StoredRx } from "@/lib/store";
import { PrescriptionExtraction } from "@/lib/ai/types";

/** Downscale on the device so the local model stays fast. Returns raw base64 JPEG + a preview URL. */
async function prepare(file: Blob) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.88);
  return { preview: url, base64: url.split(",")[1] };
}

type State =
  | { s: "empty" }
  | { s: "captured"; preview: string; base64: string }
  | { s: "processing"; preview: string }
  | { s: "error"; preview: string; base64: string; message: string; localDown: boolean }
  | { s: "done"; preview: string; rx: PrescriptionExtraction; ms: number };

export function PrescriptionScanner({ demoImage, demoLabel }: { demoImage?: string; demoLabel?: string }) {
  const [state, setState] = useState<State>({ s: "empty" });
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function load(file: Blob) {
    try {
      const p = await prepare(file);
      setState({ s: "captured", preview: p.preview, base64: p.base64 });
    } catch {
      setState({ s: "empty" });
    }
  }

  async function analyze(preview: string, base64: string) {
    setState({ s: "processing", preview });
    try {
      const res = await fetch("/api/prescription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: base64 }) });
      const j = await res.json();
      if (!res.ok) return setState({ s: "error", preview, base64, message: j.error ?? "Something went wrong.", localDown: j.code === "LOCAL_AI_UNAVAILABLE" });
      const rx = PrescriptionExtraction.parse(j.result);
      const stored: StoredRx = { extraction: rx, explanation: null, payload: null, demo: !!demoImage, at: new Date().toISOString() };
      writeLocal(KEYS.rx, stored);
      setState({ s: "done", preview, rx, ms: j.ms });
    } catch {
      setState({ s: "error", preview, base64, message: "Could not reach the app server.", localDown: false });
    }
  }

  async function useDemo() {
    const blob = await (await fetch(demoImage!)).blob();
    const p = await prepare(blob);
    analyze(p.preview, p.base64);
  }

  const preview = state.s === "empty" ? null : state.preview;
  const processing = state.s === "processing";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <div>
        <div
          className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-md border border-line bg-surface"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f); }}
        >
          {/* corner marks */}
          {["left-3 top-3 border-l border-t", "right-3 top-3 border-r border-t", "left-3 bottom-3 border-l border-b", "right-3 bottom-3 border-r border-b"].map((c) => (
            <span key={c} aria-hidden className={`absolute z-10 h-6 w-6 border-sage ${c}`} />
          ))}
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Captured prescription" className={`h-full w-full object-contain ${processing ? "opacity-80" : ""}`} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="font-serif text-2xl">Place the prescription inside the frame</p>
              <p className="text-sm text-muted">Good light, flat page, all four corners visible.</p>
            </div>
          )}
          {processing && <div className="scan-line" aria-hidden />}
        </div>

        <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take or choose a prescription photo"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />

        <div className="mx-auto mt-6 flex max-w-md flex-wrap gap-3">
          {state.s === "empty" && (
            <>
              <Button onClick={() => input.current?.click()}>Take or upload photo</Button>
              {demoImage && <Button variant="secondary" onClick={useDemo}>{demoLabel ?? "Analyze sample prescription"}</Button>}
            </>
          )}
          {state.s === "captured" && (
            <>
              <Button variant="secondary" onClick={() => setState({ s: "empty" })}>Retake</Button>
              <Button onClick={() => analyze(state.preview, state.base64)}>Analyze locally</Button>
            </>
          )}
          {state.s === "error" && (
            <>
              <Button variant="secondary" onClick={() => setState({ s: "empty" })}>Choose another</Button>
              <Button onClick={() => analyze(state.preview, state.base64)}>Try again</Button>
            </>
          )}
          {state.s === "done" && (
            <>
              <Button variant="secondary" onClick={() => setState({ s: "empty" })}>Scan another</Button>
              <Button onClick={() => router.push("/prescription")}>Review prescription</Button>
            </>
          )}
        </div>
      </div>

      <aside aria-live="polite" className="rise">
        {state.s === "empty" || state.s === "captured" ? (
          <div>
            <Badge tone="local">● Local processing</Badge>
            <h2 className="mt-4 font-serif text-2xl">Read on this machine, first.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The photo is read by Gemma 4 running locally through Ollama. It is never sent to a cloud model. Only the
              structured result can be sent later, and only when you ask for an explanation.
            </p>
          </div>
        ) : (
          <div>
            <Badge tone="local">● Local processing</Badge>
            <h2 className="mt-4 font-serif text-2xl">
              {processing ? "Reading prescription locally" : state.s === "done" ? "Prescription understood" : "Local AI is unavailable"}
            </h2>
            <p className="mt-1 text-sm text-muted">Gemma 4 · Local inference</p>
            <ul className="mt-6 space-y-3 text-sm">
              <Step done label="Image prepared on this device" />
              {state.s === "processing" && <Step running label="Gemma 4 is reading the prescription" />}
              {state.s === "done" && (
                <>
                  <Step done label="Prescription image analyzed" />
                  <Step done label={`${state.rx.medications.length} medication${state.rx.medications.length === 1 ? "" : "s"} extracted${state.rx.followUp.required ? ", 1 follow-up instruction" : ""}`} />
                  <Step done label="Sensitive image remains local" />
                  <li className="pt-2 text-xs text-muted">Finished in {(state.ms / 1000).toFixed(1)}s</li>
                </>
              )}
              {state.s === "error" && (
                <li className="rounded-md border border-red/30 bg-red-soft p-4 text-red">
                  <p className="font-medium">{state.message}</p>
                  {state.localDown && <p className="mt-1 text-sm">Check that Ollama is running, then try again.</p>}
                </li>
              )}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function Step({ label, done, running }: { label: string; done?: boolean; running?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      {done ? (
        <span aria-hidden className="text-sage-ink">✓</span>
      ) : (
        <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-sage border-t-transparent" />
      )}
      <span className={running ? "text-ink" : ""}>{label}</span>
    </li>
  );
}
