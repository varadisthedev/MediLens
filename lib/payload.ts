import type { PrescriptionExtraction } from "./ai/types";

// Shared by the server (what is sent to Gemini) and the privacy page (what would be sent). No image, no patient name.
export function buildGeminiPayloadClient(rx: PrescriptionExtraction) {
  return {
    prescriptionDate: rx.prescriptionDate,
    medications: rx.medications.map(({ name, strength, dosage, frequency, timing, duration, instructions, uncertainFields }) => ({
      name, strength, dosage, frequency, timing, duration, instructions, uncertainFields,
    })),
    instructions: rx.instructions,
    followUp: rx.followUp,
    uncertainFields: rx.uncertainFields,
  };
}
