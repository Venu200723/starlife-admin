// GET /api/appointments/[id] — patient's own appointment detail (owner-only).
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getPatientSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getPatientSession();
    if (!session) return apiError("UNAUTHORIZED", "Please sign in first.", 401);
    const { id } = await params;

    const appt = await db.appointment.findFirst({
      where: { id, patientId: session.patientId },
      include: {
        service: { select: { name: true, durationMinutes: true } },
        doctor: { select: { name: true } },
        clinic: { select: { name: true, phone: true, address: true, mapsUrl: true } },
      },
    });
    if (!appt) return apiError("NOT_FOUND", "Appointment not found.", 404);

    const settings = await getSettings();
    return apiOk({
      id: appt.id,
      code: appt.code,
      appointmentDate: appt.appointmentDate,
      startTime: appt.startTime,
      endTime: appt.endTime,
      status: appt.status,
      patientNotes: appt.patientNotes,
      adminNotes: appt.adminNotes,
      canCancel:
        ["PENDING", "CONFIRMED"].includes(appt.status) &&
        Date.now() <=
          new Date(`${appt.appointmentDate}T${appt.startTime}:00+05:30`).getTime() -
            settings.cancellationCutoffHours * 3600_000,
      service: appt.service,
      doctor: appt.doctor,
      clinic: appt.clinic,
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
