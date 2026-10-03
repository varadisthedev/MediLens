import Link from "next/link";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { label: "Scan", href: "/scan", hint: "Photograph the prescription" },
  { label: "Review", href: "/prescription", hint: "Check what Gemma 4 read" },
  { label: "Explain", href: "/prescription#explanation", hint: "Plain-language summary" },
  { label: "Plan", href: "/dashboard", hint: "Your daily schedule" },
];

/** Step-by-step procedure shown across the flow. `current` is 1-based; completed steps are links. */
export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Progress" className="rounded-xl border border-line bg-surface p-4 md:p-5">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < current;
          const body = (
            <>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${n <= current ? "bg-ink text-white" : "border border-line text-muted"}`}>
                {done ? "✓" : n}
              </span>
              <span className={`mt-2 block text-sm font-medium ${n === current ? "" : "text-muted"}`}>{s.label}</span>
              <span className="mt-0.5 hidden text-xs text-muted md:block">{s.hint}</span>
            </>
          );
          return (
            <li key={s.label} aria-current={n === current ? "step" : undefined}>
              {done ? <Link href={s.href} className="block">{body}</Link> : body}
            </li>
          );
        })}
      </ol>
      <div className="mt-4"><Progress value={current - 1} max={3} label={`Step ${current} of 4`} /></div>
    </nav>
  );
}
