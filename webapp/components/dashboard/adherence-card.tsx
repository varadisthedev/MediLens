import { adherenceStats, isoDay } from "@/lib/schedule";
import type { AdherenceMap } from "@/lib/store";

/** Doses taken vs doses scheduled over the last 7 days (days before the plan started are greyed out). */
export function AdherenceCard({ adherence, scheduledPerDay, planStart }: { adherence: AdherenceMap; scheduledPerDay: number; planStart: string }) {
  const { pct, perDay } = adherenceStats(adherence, scheduledPerDay, planStart);
  return (
    <div>
      <p className="font-serif text-6xl leading-none tracking-tight">
        {pct ?? "—"}
        {pct !== null && <span className="text-3xl text-muted">%</span>}
      </p>
      <p className="mt-2 text-sm text-muted">{pct === null ? "No scheduled doses yet." : "of scheduled doses taken"}</p>
      <div className="mt-6 flex items-end gap-2" role="img" aria-label="Adherence over the last 7 days">
        {perDay.map(({ d, taken, total }) => {
          const h = total ? Math.max(6, Math.round((taken / total) * 100)) : 6;
          const full = total > 0 && taken === total;
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end">
                <div style={{ height: `${h}%` }} className={`w-full rounded-sm ${total === 0 ? "bg-line" : full ? "bg-sage" : taken === 0 ? "bg-red/50" : "bg-amber/70"}`} />
              </div>
              <span className="text-[10px] text-muted">{d === isoDay() ? "Today" : new Date(d + "T12:00").toLocaleDateString("en", { weekday: "narrow" })}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        <span className="inline-block h-2 w-2 rounded-sm bg-sage" /> all taken <span className="ml-2 inline-block h-2 w-2 rounded-sm bg-amber/70" /> some <span className="ml-2 inline-block h-2 w-2 rounded-sm bg-red/50" /> none
      </p>
    </div>
  );
}
