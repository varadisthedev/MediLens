import { adherencePct, isoDay, lastDays } from "@/lib/schedule";
import type { AdherenceMap } from "@/lib/store";

/** Share of recorded doses taken, with a 7-day strip. Only counts doses the user actually recorded. */
export function AdherenceCard({ adherence }: { adherence: AdherenceMap }) {
  const pct = adherencePct(adherence);
  const days = lastDays(7);
  const perDay = days.map((d) => {
    const e = Object.entries(adherence).filter(([k]) => k.startsWith(d));
    return { d, taken: e.filter(([, s]) => s === "taken").length, total: e.length };
  });
  return (
    <div>
      <p className="font-serif text-6xl leading-none tracking-tight">
        {pct ?? "—"}
        {pct !== null && <span className="text-3xl text-muted">%</span>}
      </p>
      <p className="mt-2 text-sm text-muted">{pct === null ? "Mark doses as taken to start tracking." : "of recorded doses taken"}</p>
      <div className="mt-6 flex h-16 items-end gap-2" role="img" aria-label="Adherence over the last 7 days">
        {perDay.map(({ d, taken, total }) => {
          const h = total ? Math.max(6, Math.round((taken / total) * 100)) : 6;
          const full = total > 0 && taken === total;
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end">
                <div style={{ height: `${h}%` }} className={`w-full rounded-sm ${total === 0 ? "bg-line" : full ? "bg-sage" : "bg-amber/70"}`} />
              </div>
              <span className="text-[10px] text-muted">{d === isoDay() ? "Today" : new Date(d + "T12:00").toLocaleDateString("en", { weekday: "narrow" })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
