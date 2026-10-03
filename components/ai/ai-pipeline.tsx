import { Badge } from "@/components/ui/badge";

type Variant = "prescription" | "checkin";

const COPY: Record<Variant, { input: string; inputNote: string; local: string; localNote: string; data: string; result: string }> = {
  prescription: {
    input: "Prescription photo",
    inputNote: "Stays on this device",
    local: "Gemma 4",
    localNote: "Reads the image locally",
    data: "Structured prescription",
    result: "Plain-language plan",
  },
  checkin: {
    input: "Voice recording",
    inputNote: "Stays on this device",
    local: "Local speech-to-text + Gemma 4",
    localNote: "Transcribes and extracts locally",
    data: "Structured check-in",
    result: "Private health timeline",
  },
};

/** INPUT → LOCAL → STRUCTURED → CLOUD → RESULT. `cloud` toggles whether the cloud step is part of the flow. */
export function AIPipeline({ variant = "prescription", cloud = true }: { variant?: Variant; cloud?: boolean }) {
  const c = COPY[variant];
  const Step = ({ label, title, note, tone }: { label: string; title: string; note?: string; tone: "plain" | "local" | "cloud" }) => (
    <li
      className={`flex-1 rounded-md border p-4 ${
        tone === "local" ? "border-sage/40 bg-sage-soft" : tone === "cloud" ? "border-cloud/30 bg-cloud-soft" : "border-line bg-surface"
      }`}
    >
      <p className={`eyebrow ${tone === "local" ? "!text-sage-ink" : tone === "cloud" ? "!text-cloud" : ""}`}>{label}</p>
      <p className="mt-1 text-sm font-medium">{title}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </li>
  );
  const Arrow = () => (
    <li aria-hidden className="flex items-center justify-center text-muted md:px-1">
      <span className="rotate-90 md:rotate-0">→</span>
    </li>
  );
  return (
    <ol className="flex flex-col gap-1 md:flex-row md:items-stretch" aria-label="Processing pipeline">
      <Step label="Input" title={c.input} note={c.inputNote} tone="plain" />
      <Arrow />
      <Step label="Local" title={c.local} note={c.localNote} tone="local" />
      <Arrow />
      <Step label="Structured data" title={c.data} note="Only this can leave" tone="plain" />
      {cloud && (
        <>
          <Arrow />
          <Step label="Cloud" title="Gemini" note="Explains and organizes" tone="cloud" />
        </>
      )}
      <Arrow />
      <Step label="Result" title={c.result} tone="plain" />
    </ol>
  );
}

export const LocalBadge = () => <Badge tone="local">● Local</Badge>;
export const CloudBadge = () => <Badge tone="cloud">Cloud</Badge>;
