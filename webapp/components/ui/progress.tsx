/** Thin determinate bar. `tone` black for neutral progress, sage for local/success. */
export function Progress({ value, max = 100, label, tone = "ink" }: { value: number; max?: number; label: string; tone?: "ink" | "sage" }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full transition-[width] duration-500 ${tone === "ink" ? "bg-ink" : "bg-sage"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
