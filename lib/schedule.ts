import type { CheckInExtraction, PrescriptionExtraction } from "./ai/types";
import type { AdherenceMap } from "./store";

export type Dose = { key: string; time: string; medIndex: number; name: string; detail: string; asNeeded: boolean };

const SLOT: Record<string, string> = { morning: "08:00", noon: "13:00", afternoon: "14:00", evening: "20:00", night: "22:00", bedtime: "22:00" };

export const isoDay = (d = new Date()) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};

export function dosesFor(rx: PrescriptionExtraction): Dose[] {
  const out: Dose[] = [];
  rx.medications.forEach((m, i) => {
    const slots = m.timing.map((t) => SLOT[t.toLowerCase().trim()]).filter(Boolean);
    const asNeeded = /\bif\b|as needed|prn|sos/i.test(`${m.frequency ?? ""} ${m.instructions ?? ""}`);
    const detail = [m.strength, m.dosage].filter(Boolean).join(" · ") || "Dose not clear";
    [...new Set(slots)].forEach((time) =>
      out.push({ key: `${i}-${time}`, time, medIndex: i, name: m.name ?? "Unclear medication", detail, asNeeded }),
    );
  });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

/** Share of recorded doses that were taken, or null when nothing has been recorded yet. */
export function adherencePct(map: AdherenceMap) {
  const v = Object.values(map);
  return v.length ? Math.round((v.filter((s) => s === "taken").length / v.length) * 100) : null;
}

export function lastDays(n: number) {
  return Array.from({ length: n }, (_, i) => isoDay(new Date(Date.now() - (n - 1 - i) * 86400000)));
}

/** Map missed doses reported in a check-in onto scheduled doses (best effort: by medication name, then time of day). */
export function applyMissed(rx: PrescriptionExtraction, missed: CheckInExtraction["adherence"]["missedDoses"], map: AdherenceMap) {
  const doses = dosesFor(rx).filter((d) => !d.asNeeded);
  const next = { ...map };
  for (const m of missed) {
    const when = (m.when ?? "").toLowerCase();
    const date = when.includes("yesterday") ? isoDay(new Date(Date.now() - 86400000)) : isoDay();
    const slot = Object.keys(SLOT).find((s) => when.includes(s));
    let hits = doses.filter((d) => m.medication && d.name.toLowerCase().includes(m.medication.toLowerCase()));
    if (slot) hits = (hits.length ? hits : doses).filter((d) => d.time === SLOT[slot]);
    for (const d of hits.length ? hits : doses.slice(0, 1)) next[`${date}|${d.key}`] = "missed";
  }
  return next;
}
