import { Resend } from "resend";

function send(subject: string, html: string, to = process.env.REMINDER_TO_EMAIL) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from || !to) throw new Error("Email is not configured");
  return new Resend(key).emails.send({ from, to, subject, html });
}

const wrap = (body: string) =>
  `<div style="font-family:system-ui,sans-serif;color:#20221F;max-width:480px">${body}<p style="color:#6E716C;font-size:12px;margin-top:24px">MediLens helps you follow what your clinician prescribed. It does not give medical advice.</p></div>`;

export const sendMedicationReminder = (m: { name: string; detail: string; time: string }, to?: string) =>
  send(`Reminder: ${m.name} at ${m.time}`, wrap(`<h2>${m.name}</h2><p>${m.detail}</p><p>Scheduled for ${m.time}.</p>`), to);

export const sendFollowUpReminder = (notes: string, inDays: number, to?: string) =>
  send("Follow-up reminder", wrap(`<h2>Follow-up in ${inDays} days</h2><p>${notes}</p>`), to);

export const sendCheckInSummary = (summary: string, to?: string) =>
  send("Your check-in summary", wrap(`<h2>Today's check-in</h2><p>${summary}</p>`), to);
