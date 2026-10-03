import { PrescriptionScanner } from "@/components/prescription/prescription-scanner";

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <p className="eyebrow">Step 1 of 3</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">Scan your prescription</h1>
      <div className="mt-10">
        <PrescriptionScanner />
      </div>
    </div>
  );
}
