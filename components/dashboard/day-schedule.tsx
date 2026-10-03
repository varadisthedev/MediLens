"use client";
import type { ReactNode } from "react";
import { fmt12, GROUPS, groupOf, isoDay, SLOT, type Dose } from "@/lib/schedule";
import type { AdherenceMap, TakenAtMap } from "@/lib/store";

const GROUP_TIME: Record<(typeof GROUPS)[number], string> = { Morning: SLOT.morning, Afternoon: SLOT.afternoon, Evening: SLOT.evening, Night: SLOT.night };

const Icon = ({ group }: { group: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden className={group === "Night" ? "text-cloud" : "text-amber"}>
    {group === "Night" ? (
      <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
    ) : (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    )}
  </svg>
);

const Card = ({ title, icon, meta, count, children }: { title: string; icon: ReactNode; meta?: string; count: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-line bg-surface">
    <header className="flex items-center justify-between border-b border-line px-5 py-4">
      <h2 className="flex items-center gap-2.5 font-medium">{icon}{title}{meta && <span className="text-xs font-normal text-muted">{meta}</span>}</h2>
      <span className="text-xs text-muted">{count}</span>
    </header>
    <ul className="space-y-3 p-4">{children}</ul>
  </section>
);

export function DaySchedule({ doses, adherence, takenAt, onToggle, onRemind }: {
  doses: Dose[];
  adherence: AdherenceMap;
  takenAt: TakenAtMap;
  onToggle: (d: Dose) => void;
  onRemind: (d: Dose) => void;
}) {
  const today = isoDay();
  const scheduled = doses.filter((d) => !d.asNeeded);
  const asNeeded = doses.filter((d) => d.asNeeded);

  if (!doses.length) return <p className="rounded-2xl border border-line bg-surface p-8 text-sm text-muted">No dose times could be read. Use “Add medicine” to build your schedule.</p>;

  return (
    <div className="space-y-5">
      {GROUPS.map((g) => {
        const rows = scheduled.filter((d) => groupOf(d.time) === g);
        if (!rows.length) return null;
        return (
          <Card key={g} title={g} icon={<Icon group={g} />} meta={fmt12(GROUP_TIME[g])} count={`${rows.length} item${rows.length > 1 ? "s" : ""}`}>
            {rows.map((d) => {
              const status = adherence[`${today}|${d.key}`];
              const at = takenAt[`${today}|${d.key}`];
              const taken = status === "taken";
              return (
                <li key={d.key} className="flex items-center gap-4 rounded-xl border border-line bg-bg/60 px-4 py-3.5">
                  <button
                    role="checkbox" aria-checked={taken} aria-label={`${taken ? "Unmark" : "Mark"} ${d.name} as taken`}
                    onClick={() => onToggle(d)}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors ${taken ? "border-ink bg-ink text-white" : "border-ink/30 bg-surface hover:border-ink"}`}
                  >
                    {taken && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5L20 7" /></svg>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={taken ? "text-muted line-through" : ""}>
                      <span className="font-medium">{d.name}</span>{d.strength && <span className="ml-1.5 text-sm text-muted">{d.strength}</span>}
                    </p>
                    <p className="truncate text-sm text-muted">Take {d.detail}{d.note ? ` · ${d.note}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {taken ? (
                      <span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-sage-ink">Taken{at ? ` ${new Date(at).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}` : ""}</span>
                    ) : status === "missed" ? (
                      <span className="rounded-full bg-red-soft px-3 py-1 text-xs font-medium text-red">Missed</span>
                    ) : (
                      <span className="rounded-full bg-line/60 px-3 py-1 text-xs text-muted">Pending</span>
                    )}
                    {!taken && <button onClick={() => onRemind(d)} className="text-[11px] text-muted underline-offset-4 hover:text-ink hover:underline">Email reminder</button>}
                  </div>
                </li>
              );
            })}
          </Card>
        );
      })}

      {asNeeded.length > 0 && (
        <Card title="As needed" icon={<Icon group="Morning" />} count={`${asNeeded.length} item${asNeeded.length > 1 ? "s" : ""}`}>
          {asNeeded.map((d) => (
            <li key={d.key} className="rounded-xl border border-line bg-bg/60 px-4 py-3.5">
              <p><span className="font-medium">{d.name}</span>{d.strength && <span className="ml-1.5 text-sm text-muted">{d.strength}</span>}</p>
              <p className="text-sm text-muted">Take {d.detail}{d.note ? ` · ${d.note}` : ""}. Follow the limits written on your prescription.</p>
            </li>
          ))}
        </Card>
      )}
    </div>
  );
}
