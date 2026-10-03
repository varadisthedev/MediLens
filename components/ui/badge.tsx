import type { ReactNode } from "react";

const tones = {
  local: "bg-sage-soft text-sage-ink",
  cloud: "bg-cloud-soft text-cloud",
  warn: "bg-amber-soft text-amber",
  danger: "bg-red-soft text-red",
  neutral: "bg-bg text-muted border border-line",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}>{children}</span>;
}
