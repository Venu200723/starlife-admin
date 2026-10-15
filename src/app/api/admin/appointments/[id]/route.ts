// PATCH /api/admin/appointments/[id] — change status / add admin notes.
// Every status change writes an in-app notification for the patient.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { statusChangeSchema } from "@/lib/validation";
import { createNotification } from "@/lib/notifications";
import { claimSlotOrConflict, ACTIVE_STATUSES } from "@/lib/booking";
import { formatDateMedium, formatTime12h } from "@/lib/time";

const STATUS_MESSAGES: Record<string, { title: string; body: (s: string, d: string, t: string) => string }> = {
  CONFIRMED: {
    title: "Appointment confirmed",
    body: (_s, d, t) => `Your appointment is confirmed for ${d} at ${t}. We look forward to seeing you.`,
  },
  REJECTED: {
    title: "Appointment request declined",
    body: (_s, d, t) => `Unfortunately your appointment request for ${d} at ${t} could not be accepted. Please call the clinic to reschedule.`,
  },
  CANCELLED: {
    title: "Appointment cancelled",
    body: (_s, d, t) => `Your appointment scheduled for ${d} at ${t} has been cancelled by the clinic.`,
  },
  COMPLETED: {
    title: "Visit completed",
    body: (_s, d) => `Your visit on ${d} is marked complete. Thank you for choosing STAR LIFE Clinic.`,
  },
  NO_SHOW: {
    title: "Appointment marked as missed",
    body: (_s, d, t) => `You were marked absent for the ${d} ${t} appointment. Please book again or call the clinic.`,
  },
  PENDING: {
    title: "Appointment re-opened",
    body: (_s, d, t) => `Your appointment for ${d} at ${t} is pending confirmation again.`,
  },
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const { id } = await params;

    const parsed = statusChangeSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid status change.", 400);

    const appt = await db.appointment.findUnique({
      where: { id },
      include: { patient: true, service: { select: { name: true } } },
    });
    if (!appt) return apiError("NOT_FOUND", "Appointment not found.", 404);

    // Maintain the slot-holding key: active statuses hold the slot, terminal
    // statuses release it (making the slot bookable again).
    const wasActive = ACTIVE_STATUSES.includes(appt.status);
    const willBeActive = ACTIVE_STATUSES.includes(parsed.data.status);
    let slotKey = appt.slotKey;
    if (!wasActive && willBeActive) {
      const claim = await claimSlotOrConflict(id);
      if (!claim.ok) return apiError("CONFLICT_SLOT_TAKEN", claim.message, 409);
      slotKey = `${appt.doctorId}|${appt.appointmentDate}|${appt.startTime}`;
    } else if (wasActive && !willBeActive) {
      slotKey = null;
    }

    const updated = await db.appointment.update({
      where: { id },
      data: {
        status: parsed.data.status,
        slotKey,
        ...(parsed.data.adminNotes !== undefined ? { adminNotes: parsed.data.adminNotes } : {}),
      },
    });

    const tpl = STATUS_MESSAGES[parsed.data.status];
    if (tpl) {
      const d = formatDateMedium(appt.appointmentDate);
      const t = formatTime12h(appt.startTime);
      await createNotification(
        appt.patientId,
        tpl.title,
        tpl.body(appt.service.name, d, t),
        "STATUS",
        appt.id,
      );
    }

    return apiOk({ id: updated.id, status: updated.status });
  } catch (err) {
    return handleServerError(req, err);
  }
}
