"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StoredCheckIn } from "@/lib/store";

const LABELS = ["", "Very poor", "Poor", "Okay", "Good", "Very good"];

/** Self-reported well-being only (1–5), taken from the user's own check-ins. */
export function SymptomChart({ checkIns }: { checkIns: StoredCheckIn[] }) {
  const data = checkIns
    .filter((c) => c.data.wellbeing != null)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((c) => ({ day: new Date(c.at).toLocaleDateString("en", { month: "short", day: "numeric" }), wellbeing: c.data.wellbeing }));

  if (data.length < 2)
    return <p className="py-6 text-sm text-muted">Your self-reported well-being will appear here after a couple of check-ins.</p>;

  return (
    <div className="h-48 w-full" role="img" aria-label="Self-reported well-being over time">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#e4e1d9" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6e716c" }} axisLine={false} tickLine={false} />
          <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tick={{ fontSize: 11, fill: "#6e716c" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [LABELS[Number(v)], "You reported"]} contentStyle={{ border: "1px solid #e4e1d9", borderRadius: 6, fontSize: 12, boxShadow: "none" }} />
          <Line type="monotone" dataKey="wellbeing" stroke="#668b73" strokeWidth={2} dot={{ r: 3, fill: "#668b73", strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
