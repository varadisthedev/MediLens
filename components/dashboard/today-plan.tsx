"use client";
import type { AdherenceMap } from "@/lib/store";
import { isoDay, type Dose } from "@/lib/schedule";

export function TodayPlan({ doses, adherence, onMark, onRemind }: {
  doses: Dose[];
  adherence: AdherenceMap;
  onMark: (key: string, status: "taken" | "missed" | null) => void;
  onRemind: (d: Dose) => void;
}) {
  const today = isoDay();
  const now = new Date().toTimeString().slice(0, 5);
  const scheduled = doses.filter((d) => !d.asNeeded);
  const asNeeded = [...new Map(doses.filter((d) => d.asNeeded).map((d) => [d.medIndex, d])).values()];

  if (scheduled.length === 0 && asNeeded.length === 0)
    return <p className="py-8 text-sm text-muted">No dose times could be read from the prescription.</p>;

  return (
    <div>
      <ul className="divide-y divide-line border-y border-line">
        {scheduled.map((d) => {
          const status = adherence[`${today}|${d.key}`];
          const late = !status && d.time < now;
          return (
            <li key={d.key} className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[64px_1fr_auto]">
              <span className="font-mono text-sm text-muted">{d.time}</span>
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-sm text-muted">{d.detail}</p>
              </div>
              <div className="col-start-2 flex items-center gap-3 sm:col-start-3">
                {status === "taken" && <span className="text-sm text-sage-ink">✓ Completed</span>}
                {status === "missed" && <span className="text-sm text-red">Missed</span>}
                {!status && <span className={`text-sm ${late ? "text-amber" : "text-muted"}`}>{late ? "Due" : "Upcoming"}</span>}
                <button onClick={() => onMark(d.key, status === "taken" ? null : "taken")}
                  className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-ink/40">
                  {status === "taken" ? "Undo" : "Mark taken"}
                </button>
                <button onClick={() => onRemind(d)} className="text-xs text-muted underline-offset-4 hover:text-ink hover:underline">
                  Email reminder
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {asNeeded.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          As prescribed when needed: {asNeeded.map((d) => `${d.name} (${d.detail})`).join(", ")}. Follow the limits written on your prescription.
        </p>
      )}
    </div>
  );
}
