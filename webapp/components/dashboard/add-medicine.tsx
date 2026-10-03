"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PrescriptionExtraction } from "@/lib/ai/types";

type Med = PrescriptionExtraction["medications"][number];
const SLOTS = ["morning", "afternoon", "evening", "bedtime"] as const;

const field = "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm";

/** Manual entry, for medicines the scan missed or that were added later. */
export function AddMedicine({ onAdd, onClose }: { onAdd: (m: Med) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [timing, setTiming] = useState<string[]>(["morning"]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({
          name: name.trim(), strength: strength.trim() || null, dosage: dosage.trim() || null,
          frequency: null, timing, duration: duration.trim() || null,
          instructions: "Added by you", confidence: 1, uncertainFields: [],
        });
      }}
      className="rise rounded-2xl border border-line bg-surface p-5"
    >
      <h2 className="font-medium">Add medicine</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Name<input required value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
        <label className="text-sm">Strength<input value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="500 mg" className={field} /></label>
        <label className="text-sm">How much each time<input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="1 tablet" className={field} /></label>
        <label className="text-sm">For how long<input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="5 days" className={field} /></label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm">When</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SLOTS.map((s) => (
            <label key={s} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm capitalize ${timing.includes(s) ? "border-ink bg-ink text-white" : "border-line"}`}>
              <input type="checkbox" className="sr-only" checked={timing.includes(s)} onChange={() => setTiming(timing.includes(s) ? timing.filter((t) => t !== s) : [...timing, s])} />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={!name.trim() || timing.length === 0}>Add to my plan</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}
