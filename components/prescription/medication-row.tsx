import { Badge } from "@/components/ui/badge";
import type { PrescriptionExtraction } from "@/lib/ai/types";

type Med = PrescriptionExtraction["medications"][number];

export function ConfidenceBadge({ confidence, uncertain }: { confidence: number; uncertain: boolean }) {
  if (uncertain || confidence < 0.5) return <Badge tone="warn">Needs verification</Badge>;
  if (confidence < 0.8) return <Badge tone="neutral">Medium confidence</Badge>;
  return <Badge tone="local">High confidence</Badge>;
}

const Field = ({ label, value, unclear }: { label: string; value: string | null; unclear: boolean }) => (
  <div>
    <dt className="eyebrow">{label}</dt>
    <dd className={`mt-1 text-sm ${value ? "" : "italic text-muted"} ${unclear ? "rounded-sm bg-amber-soft px-1 -mx-1" : ""}`}>
      {value ?? "Not clear"}
    </dd>
  </div>
);

export function MedicationRow({ med, index }: { med: Med; index: number }) {
  const unclear = (f: string) => med.uncertainFields.some((u) => u.toLowerCase().includes(f));
  const uncertain = med.uncertainFields.length > 0 || !med.name;
  const schedule = med.timing.length ? med.timing.map((t) => t[0].toUpperCase() + t.slice(1)).join(" + ") : med.frequency;
  return (
    <li className={`py-6 ${uncertain ? "border-l-2 border-amber pl-4" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-medium tracking-tight">
          <span className="mr-3 font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
          {med.name ?? "Unreadable name"}
        </h3>
        <ConfidenceBadge confidence={med.confidence} uncertain={uncertain} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Field label="Strength" value={med.strength} unclear={unclear("strength")} />
        <Field label="Dose" value={med.dosage} unclear={unclear("dosage")} />
        <Field label="Schedule" value={schedule} unclear={unclear("frequency") || unclear("timing")} />
        <Field label="Duration" value={med.duration} unclear={unclear("duration")} />
      </dl>
      {med.instructions && <p className="mt-4 text-sm text-muted">{med.instructions}</p>}
      {uncertain && (
        <p className="mt-3 text-sm text-amber">
          Parts of this entry were hard to read. Please check with your doctor or pharmacist before relying on it.
        </p>
      )}
    </li>
  );
}
