"use client";
import { useEffect, useRef, useState } from "react";
import { AIPipeline, LocalBadge } from "@/components/ai/ai-pipeline";
import { Button } from "@/components/ui/button";
import { CheckInExtraction } from "@/lib/ai/types";
import { transcribeLocally } from "@/lib/ai/stt-browser";
import { applyMissed, patientName } from "@/lib/schedule";
import { adhKey, KEYS, mirrorToDb, readLocal, writeLocal, type AdherenceMap, type StoredCheckIn, type StoredRx } from "@/lib/store";
import { DEMO_PATIENT } from "@/lib/demo";

type Phase =
  | { p: "idle" }
  | { p: "recording" }
  | { p: "stt"; pct: number | null }
  | { p: "gemma" }
  | { p: "confirm"; warn: boolean }
  | { p: "typed" }
  | { p: "done"; transcript: string; data: CheckInExtraction }
  | { p: "error"; message: string; localDown?: boolean };

const SAMPLE = "I missed my evening dose yesterday. My fever is better but I still have a cough.";

export function VoiceRecorder() {
  const [phase, setPhase] = useState<Phase>({ p: "idle" });
  const [text, setText] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  async function start() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setPhase({ p: "error", message: "Microphone access was blocked. You can type your check-in instead." });
    }
    chunks.current = [];
    const r = new MediaRecorder(stream.current);
    r.ondataavailable = (e) => chunks.current.push(e.data);
    r.onstop = () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      handleAudio(new Blob(chunks.current, { type: r.mimeType }));
    };
    r.start();
    rec.current = r;
    setPhase({ p: "recording" });
  }

  async function handleAudio(blob: Blob) {
    setPhase({ p: "stt", pct: null });
    let transcript = "";
    try {
      transcript = await transcribeLocally(blob, (pct) => setPhase({ p: "stt", pct }));
    } catch (e) {
      const silent = e instanceof Error && e.message === "SILENT";
      return setPhase({
        p: "error",
        message: silent
          ? "The recording was silent. Check that the right microphone is selected and allowed, then record again, or type your check-in."
          : "Local speech recognition could not start (the model may need a one-time download). Type your check-in instead.",
      });
    }
    // Let the person check what was heard before Gemma sees it. Flag likely mis-hearings.
    const words = transcript.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
    setText(transcript);
    setPhase({ p: "confirm", warn: words.length < 3 });
  }

  async function extract(transcript: string) {
    setPhase({ p: "gemma" });
    try {
      const res = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript }) });
      const j = await res.json();
      if (!res.ok) return setPhase({ p: "error", message: j.error, localDown: j.code === "LOCAL_AI_UNAVAILABLE" });
      const data = CheckInExtraction.parse(j.result);
      save(transcript, data);
      setPhase({ p: "done", transcript, data });
    } catch {
      setPhase({ p: "error", message: "Could not reach the app server." });
    }
  }

  function save(transcript: string, data: CheckInExtraction) {
    const rx = readLocal<StoredRx | null>(KEYS.rx, null);
    const list = readLocal<StoredCheckIn[]>(KEYS.checkIns, []);
    writeLocal(KEYS.checkIns, [...list, { id: crypto.randomUUID(), at: new Date().toISOString(), transcript, data }]);
    if (rx && data.adherence.missedDoses.length)
      writeLocal(adhKey(rx), applyMissed(rx.extraction, data.adherence.missedDoses, readLocal<AdherenceMap>(adhKey(rx), {})));
    mirrorToDb({ kind: "checkin", transcript, data, patientName: patientName(rx?.extraction.patient.name ?? null) ?? DEMO_PATIENT });
  }

  const busy = phase.p === "stt" || phase.p === "gemma";

  return (
    <div className="mx-auto max-w-2xl">
      {phase.p !== "done" && (
        <div className="flex flex-col items-center text-center">
          <button
            onClick={() => (phase.p === "recording" ? rec.current?.stop() : start())}
            disabled={busy}
            aria-label={phase.p === "recording" ? "Stop recording" : "Start recording"}
            className={`grid h-28 w-28 place-items-center rounded-full border transition-colors disabled:opacity-40 ${
              phase.p === "recording" ? "border-sage bg-sage text-white" : "border-line bg-surface text-sage-ink hover:border-sage"
            }`}
          >
            {phase.p === "recording" ? (
              <span className="flex h-10 items-center gap-1" aria-hidden>
                {[0, 0.2, 0.4, 0.1, 0.3].map((d, i) => <span key={i} className="wave-bar !bg-white" style={{ animationDelay: `${d}s` }} />)}
              </span>
            ) : (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            )}
          </button>
          <p className="mt-6 text-sm text-muted" role="status" aria-live="polite">
            {phase.p === "idle" && "Click to record. Click again to finish."}
            {phase.p === "recording" && "Listening… click again when you are done."}
            {phase.p === "stt" && (phase.pct != null && phase.pct < 100 ? `Loading local speech model… ${phase.pct}%` : "Transcribing on this device…")}
            {phase.p === "gemma" && "Gemma 4 is structuring your check-in locally…"}
            {phase.p === "confirm" && "Transcribed on this device. Nothing has been sent yet."}
          </p>

          {busy && (
            <ol className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2"><span className="text-sage-ink">✓</span> Audio kept on this device</li>
              <li className={phase.p === "stt" ? "" : "text-muted"}>{phase.p === "stt" ? "◌" : "✓"} Local speech-to-text (Whisper)</li>
              <li className={phase.p === "gemma" ? "" : "text-muted"}>{phase.p === "gemma" ? "◌" : "○"} Gemma 4 · structured check-in</li>
            </ol>
          )}

          {phase.p === "confirm" && (
            <form onSubmit={(e) => { e.preventDefault(); extract(text); }} className="mt-6 w-full space-y-3 text-left">
              <label htmlFor="ci-heard" className="eyebrow">What we heard — edit if needed</label>
              <textarea id="ci-heard" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-lg border border-line bg-surface p-3 text-sm" />
              {phase.warn && <p role="alert" className="rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">That looks very short. If it is wrong, correct it above or record again.</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={text.trim().length < 3}>Analyze locally</Button>
                <Button type="button" variant="secondary" onClick={() => { setText(""); setPhase({ p: "idle" }); }}>Record again</Button>
              </div>
            </form>
          )}

          {phase.p === "error" && (
            <div role="alert" className="mt-6 w-full rounded-md border border-red/30 bg-red-soft p-4 text-left text-sm text-red">
              <p className="font-medium">{phase.message}</p>
              {phase.localDown && <p className="mt-1">Check that Ollama is running, then try again.</p>}
            </div>
          )}

          {(phase.p === "idle" || phase.p === "error" || phase.p === "typed") && (
            <div className="mt-8 w-full text-left">
              {phase.p === "typed" || phase.p === "error" ? (
                <form onSubmit={(e) => { e.preventDefault(); extract(text); }} className="space-y-3">
                  <label htmlFor="ci-text" className="eyebrow">Type your check-in</label>
                  <textarea id="ci-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={SAMPLE}
                    className="w-full rounded-md border border-line bg-surface p-3 text-sm" />
                  <Button type="submit" disabled={text.trim().length < 3}>Analyze locally</Button>
                </form>
              ) : (
                <button onClick={() => setPhase({ p: "typed" })} className="mx-auto block text-sm text-muted underline underline-offset-4 hover:text-ink">
                  Type instead
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {phase.p === "done" && (
        <div className="rise">
          <LocalBadge />
          <h2 className="mt-4 font-serif text-3xl">Today you reported</h2>
          {phase.data.symptoms.length ? (
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {phase.data.symptoms.map((s, i) => (
                <li key={i} className="flex justify-between py-3 text-sm">
                  <span className="capitalize">{s.name}</span>
                  <span className="text-muted">{s.status === "unspecified" ? "mentioned" : s.status}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-muted">No symptoms mentioned.</p>}
          <h3 className="eyebrow mt-8">Medication adherence</h3>
          <p className="mt-2 text-sm">
            {phase.data.adherence.missedDoses.length
              ? `${phase.data.adherence.missedDoses.length} missed dose${phase.data.adherence.missedDoses.length > 1 ? "s" : ""} reported${phase.data.adherence.missedDoses[0].when ? ` (${phase.data.adherence.missedDoses.map((m) => m.when).filter(Boolean).join(", ")})` : ""}`
              : phase.data.adherence.takenAsPrescribed ? "Taken as prescribed" : "Nothing reported"}
          </p>
          <h3 className="eyebrow mt-8">What we heard</h3>
          <p className="mt-2 text-sm text-muted">“{phase.transcript}”</p>
          <p className="mt-6 text-sm text-sage-ink">✓ Saved to your private health timeline.</p>
          <p className="mt-1 text-xs text-muted">Your recording was never uploaded. If symptoms are worsening or you are concerned, contact your clinician or seek appropriate medical care.</p>
          <div className="mt-8"><AIPipeline variant="checkin" cloud={false} /></div>
          <div className="mt-8 flex gap-3">
            <Button href="/dashboard">Back to my plan</Button>
            <Button variant="secondary" onClick={() => { setText(""); setPhase({ p: "idle" }); }}>New check-in</Button>
          </div>
        </div>
      )}
    </div>
  );
}
