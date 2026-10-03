import type { CheckInExtraction, PrescriptionExtraction } from "./ai/types";
import type { AdherenceMap } from "./store";

export type Dose = { key: string; time: string; medIndex: number; name: string; strength: string | null; detail: string; note: string | null; asNeeded: boolean };

export const SLOT: Record<string, string> = { morning: "08:00", noon: "13:00", afternoon: "13:00", evening: "19:00", night: "21:00", bedtime: "21:00" };

export const isoDay = (d = new Date()) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};

export const GROUPS = ["Morning", "Afternoon", "Evening", "Night"] as const;
export const groupOf = (time: string) => (time < "12:00" ? "Morning" : time < "17:00" ? "Afternoon" : time < "20:00" ? "Evening" : "Night");

export const fmt12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export function dosesFor(rx: PrescriptionExtraction): Dose[] {
  const out: Dose[] = [];
  rx.medications.forEach((m, i) => {
    const slots = m.timing.map((t) => SLOT[t.toLowerCase().trim()]).filter(Boolean);
    const asNeeded = /\bif\b|as needed|prn|sos/i.test(`${m.frequency ?? ""} ${m.dosage ?? ""} ${m.instructions ?? ""}`);
    const base = {
      medIndex: i,
      name: m.name ?? "Unclear medication",
      strength: m.strength,
      detail: m.dosage ?? "Dose not clear",
      note: m.instructions,
      asNeeded,
    };
    // As-needed medicines are listed separately, not scheduled.
    if (asNeeded) return out.push({ ...base, key: `${i}-prn`, time: "PRN" });
    [...new Set(slots)].forEach((time) => out.push({ ...base, key: `${i}-${time}`, time }));
  });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

/** Course length in days from text like "5 days" / "2 weeks"; null if unclear. */
export function courseDays(duration: string | null) {
  const m = duration?.match(/(\d+)\s*(day|week|month)/i);
  return m ? Number(m[1]) * ({ day: 1, week: 7, month: 30 }[m[2].toLowerCase() as "day"]) : null;
}

/**
 * Adherence = doses taken / doses scheduled, per day, from the first day of the plan (or the earliest recorded day) up to today.
 * Doses not yet ticked count as not taken, so ticking 2 of 3 is 67%, not 100%.
 */
export function adherenceStats(map: AdherenceMap, scheduledPerDay: number, planStart: string, days = 7) {
  const recorded = Object.keys(map).map((k) => k.split("|")[0]).sort();
  const start = recorded[0] && recorded[0] < planStart ? recorded[0] : planStart;
  const perDay = lastDays(days).map((d) => {
    const total = d >= start ? scheduledPerDay : 0;
    const taken = Object.entries(map).filter(([k, v]) => k.startsWith(d) && v === "taken").length;
    return { d, taken: Math.min(taken, total || taken), total };
  });
  const total = perDay.reduce((n, x) => n + x.total, 0);
  const taken = perDay.reduce((n, x) => n + (x.total ? x.taken : 0), 0);
  return { pct: total ? Math.round((taken / total) * 100) : null, perDay };
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
    if (slot) hits = (hits.length ? hits : doses).filter((d) => groupOf(d.time) === groupOf(SLOT[slot]));
    for (const d of hits.length ? hits : doses.slice(0, 1)) next[`${date}|${d.key}`] = "missed";
  }
  return next;
}

/** The model sometimes reads the doctor as the patient; reject names that carry a clinician title. */
export const patientName = (name: string | null) => (name && !/\b(dr|doctor|mbbs|md|clinic|hospital)\b/i.test(name) ? name.split(/[\s(]/)[0] : null);
