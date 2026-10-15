// GET /api/auth/patient/me — session probe + profile + unread count.
import { db } from "@/lib/db";
import { apiOk, apiOkNull, handleServerError } from "@/lib/api";
import { getPatientSession } from "@/lib/session";
import { generateDueReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getPatientSession();
    if (!session) return apiOkNull();

    await generateDueReminders(session.patientId).catch(() => undefined);
    const [patient, unread] = await Promise.all([
      db.patient.findUnique({ where: { id: session.patientId } }),
      db.notification.count({ where: { patientId: session.patientId, read: false } }),
    ]);
    if (!patient) return apiOkNull();
    return apiOk({
      id: patient.id,
      phone: patient.phone,
      fullName: patient.fullName,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
      unreadNotifications: unread,
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
