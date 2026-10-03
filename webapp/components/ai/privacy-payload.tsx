/** Expandable view of the exact JSON that is (or would be) sent to Gemini. */
export function PrivacyPayload({ payload, label = "Show Gemini payload" }: { payload: unknown; label?: string }) {
  return (
    <details className="group rounded-md border border-line bg-surface">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium marker:content-none">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>
        {label}
      </summary>
      <pre className="max-h-96 overflow-auto border-t border-line bg-bg p-4 font-mono text-xs leading-relaxed text-ink/80">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}
