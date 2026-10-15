// In-app notification helpers. Push (Expo Notifications) plugs in here when
// the React Native shell is connected; the rows below are the source of truth.
import { db } from "./db";
import { getSettings } from "./settings";
import { getZonedNow, addDays } from "./time";

export type NotificationType = "BOOKING" | "STATUS" | "REMINDER" | "SCHEDULE" | "GENERAL";

export async function createNotification(
  patientId: string,
  title: string,
  body: string,
  type: NotificationType,
  referenceId?: string,
) {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;
  await db.notification.create({
    data: { patientId, title, body, type, referenceId: referenceId ?? null },
  });
}

/**
 * Generate due reminders (appointment is tomorrow, clinic-local) exactly once
 * per appointment. Called opportunistically when a signed-in patient loads data.
 */
export async function generateDueReminders(patientId: string) {
  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;
  const now = getZonedNow();
  const tomorrow = addDays(now.dateStr, 1);

  const due = await db.appointment.findMany({
    where: {
      patientId,
      appointmentDate: tomorrow,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: { service: true },
  });
  for (const appt of due) {
    const exists = await db.notification.findFirst({
      where: { patientId, type: "REMINDER", referenceId: appt.id },
    });
    if (exists) continue;
    const [h, m] = appt.startTime.split(":").map(Number);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? "PM" : "AM";
    await db.notification.create({
      data: {
        patientId,
        type: "REMINDER",
        referenceId: appt.id,
        title: "Appointment tomorrow",
        body: `Reminder: Your STAR LIFE Clinic appointment for ${appt.service.name} is tomorrow at ${h12}:${String(m).padStart(2, "0")} ${ampm}.`,
      },
    });
  }
}
