import { boolean, jsonb, pgTable, real, text, timestamp, uuid, date } from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at").defaultNow().notNull();

export const patients = pgTable("patients", { id: id(), name: text("name").notNull(), createdAt: createdAt() });

export const prescriptions = pgTable("prescriptions", {
  id: id(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  prescriptionDate: text("prescription_date"),
  // The raw image is never stored.
  gemmaResult: jsonb("gemma_result").notNull(),
  geminiSummary: jsonb("gemini_summary"),
  createdAt: createdAt(),
});

export const medications = pgTable("medications", {
  id: id(),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id, { onDelete: "cascade" }).notNull(),
  name: text("name"),
  strength: text("strength"),
  dosage: text("dosage"),
  frequency: text("frequency"),
  timing: jsonb("timing").$type<string[]>().notNull(),
  duration: text("duration"),
  instructions: text("instructions"),
  confidence: real("confidence").notNull(),
  createdAt: createdAt(),
});

export const reminders = pgTable("reminders", {
  id: id(),
  medicationId: uuid("medication_id").references(() => medications.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  scheduledTime: text("scheduled_time"),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: createdAt(),
});

export const checkIns = pgTable("check_ins", {
  id: id(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  transcript: text("transcript").notNull(),
  structuredData: jsonb("structured_data").notNull(),
  summary: text("summary"),
  createdAt: createdAt(),
});

export const adherence = pgTable("adherence", {
  id: id(),
  medicationId: uuid("medication_id").references(() => medications.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  status: text("status", { enum: ["taken", "missed", "skipped"] }).notNull(),
  createdAt: createdAt(),
});

