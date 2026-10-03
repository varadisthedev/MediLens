import type { CheckInExtraction } from "./ai/types";
import type { AdherenceMap, StoredCheckIn } from "./store";
import type { Dose } from "./schedule";
import { isoDay } from "./schedule";

export const DEMO_PATIENT = "Varad";
export const DEMO_IMAGE = "/demo/prescription.jpg";

const mk = (wellbeing: number, symptoms: CheckInExtraction["symptoms"], missed = false): CheckInExtraction => ({
  symptoms,
  adherence: { missedDoses: missed ? [{ medication: null, when: "evening" }] : [], takenAsPrescribed: !missed },
  wellbeing,
  followUpNotes: [],
});

const s = (name: string, status: CheckInExtraction["symptoms"][number]["status"]) => ({ name, status, note: null });

// Labelled demo data: user-reported check-ins for the five days before today.
export function demoCheckIns(): StoredCheckIn[] {
  const rows: [number, string, CheckInExtraction][] = [
    [5, "I have a fever and a bad cough. I feel really tired.", mk(1, [s("fever", "new"), s("cough", "new")])],
    [4, "Still a fever and cough but I took everything on time.", mk(2, [s("fever", "same"), s("cough", "same")])],
    [3, "Fever is a bit lower. Cough is the same.", mk(2, [s("fever", "improved"), s("cough", "same")])],
    [2, "I missed my evening medicine. Fever is much better, cough remains.", mk(3, [s("fever", "improved"), s("cough", "same")], true)],
    [1, "No fever today. Still coughing a little, feeling better.", mk(4, [s("fever", "resolved"), s("cough", "improved")])],
  ];
  return rows.map(([ago, transcript, data]) => ({
    id: `demo-${ago}`, at: new Date(Date.now() - ago * 86400000).toISOString(), transcript, data, demo: true,
  }));
}

export function demoAdherence(doses: Dose[]): AdherenceMap {
  const map: AdherenceMap = {};
  const scheduled = doses.filter((d) => !d.asNeeded);
  for (let ago = 5; ago >= 1; ago--)
    for (const d of scheduled)
      map[`${isoDay(new Date(Date.now() - ago * 86400000))}|${d.key}`] =
        ago === 2 && d === scheduled.filter((x) => x.time === "20:00")[0] ? "missed" : "taken";
  return map;
}
