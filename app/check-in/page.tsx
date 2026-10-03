import { VoiceRecorder } from "@/components/checkin/voice-recorder";

export default function CheckInPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <p className="eyebrow">Daily check-in</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">Tell us how you&apos;re feeling.</h1>
      <p className="mt-3 max-w-xl text-muted">
        Speak naturally. Your voice is transcribed on this device and structured by Gemma 4 locally. The recording is never uploaded.
      </p>
      <div className="mt-14"><VoiceRecorder /></div>
    </div>
  );
}
