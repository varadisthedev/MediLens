import { z } from "zod";

export const Medication = z.object({
  name: z.string().nullable(),
  strength: z.string().nullable(),
  dosage: z.string().nullable(),
  frequency: z.string().nullable(),
  timing: z.array(z.string()),
  duration: z.string().nullable(),
  instructions: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  uncertainFields: z.array(z.string()),
});

export const PrescriptionExtraction = z.object({
  patient: z.object({ name: z.string().nullable() }),
  prescriptionDate: z.string().nullable(),
  medications: z.array(Medication),
  instructions: z.array(z.string()),
  followUp: z.object({
    required: z.boolean(),
    afterDays: z.number().nullable(),
    notes: z.string().nullable(),
  }),
  uncertainFields: z.array(z.string()),
  overallConfidence: z.number().min(0).max(1),
});
export type PrescriptionExtraction = z.infer<typeof PrescriptionExtraction>;

export const CheckInExtraction = z.object({
  symptoms: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["improved", "same", "worse", "new", "resolved", "unspecified"]),
      note: z.string().nullable(),
    }),
  ),
  adherence: z.object({
    missedDoses: z.array(z.object({ medication: z.string().nullable(), when: z.string().nullable() })),
    takenAsPrescribed: z.boolean().nullable(),
  }),
  wellbeing: z.number().min(1).max(5).nullable(),
  followUpNotes: z.array(z.string()),
});
export type CheckInExtraction = z.infer<typeof CheckInExtraction>;

export const Explanation = z.object({
  glance: z.string(),
  whatItSays: z.string(),
  schedule: z.array(z.object({ time: z.string(), medication: z.string(), detail: z.string() })),
  followUp: z.string(),
  remember: z.array(z.string()),
  terms: z.array(z.object({ term: z.string(), meaning: z.string() })),
  questionsForClinician: z.array(z.string()),
});
export type Explanation = z.infer<typeof Explanation>;

export class LocalAIUnavailableError extends Error {
  code = "LOCAL_AI_UNAVAILABLE" as const;
}
