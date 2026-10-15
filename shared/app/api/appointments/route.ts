// GET  /api/appointments — the signed-in patient's appointments (upcoming|past).
// POST /api/appointments — create a booking (server-side revalidation + race guards).
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getPatientSession } from "@/lib/session";
import { bookingSchema } from "@/lib/validation";
import { createBooking } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { getZonedNow, compareDates } from "@/lib/time";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const INCLUDE = {
  service: { select: { name: true, durationMinutes: true } },
  doctor: { select: { name: true } },
} as const;

export async function GET(req: Request) {
  try {
    const session = await getPatientSession();
    if (!session) return apiError("UNAUTHORIZED", "Please sign in to view your appointments.", 401);

    const scope = new URL(req.url).searchParams.get("scope") ?? "upcoming";
    const now = getZonedNow();

    const rows = await db.appointment.findMany({
      where: {
        patientId: session.patientId,
        ...(scope === "upcoming"
          ? { appointmentDate: { gte: now.dateStr }, status: { in: ["PENDING", "CONFIRMED"] } }
          : {
              OR: [
                { status: { in: ["COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"] } },
                { appointmentDate: { lt: now.dateStr }, status: { in: ["PENDING", "CONFIRMED"] } },
              ],
            }),
      },
      include: INCLUDE,
      orderBy: scope === "upcoming"
        ? [{ appointmentDate: "asc" }, { startTime: "asc" }]
        : [{ appointmentDate: "desc" }, { startTime: "desc" }],
      take: 100,
    });

    const settings = await getSettings();
    const items = rows.map((a) => ({
      id: a.id,
      code: a.code,
      appointmentDate: a.appointmentDate,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      patientNotes: a.patientNotes,
      canCancel:
        ["PENDING", "CONFIRMED"].includes(a.status) &&
        Date.now() <=
          new Date(`${a.appointmentDate}T${a.startTime}:00+05:30`).getTime() -
            settings.cancellationCutoffHours * 3600_000,
      service: a.service,
      doctor: a.doctor,
    }));
    return apiOk({ items, today: now.dateStr });
  } catch (err) {
    return handleServerError(req, err);
  }
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`book:${clientIp(req)}`, 10, 60 * 60_000);
    if (!rl.ok) {
      return apiError("RATE_LIMITED", "Too many booking attempts. Please try again later.", 429);
    }

    const parsed = bookingSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Please check the booking details.";
      return apiError("VALIDATION_ERROR", msg, 400);
    }

    // Signed-in bookers get the appointment attached to their account. The
    // phone number on the form is the appointment contact (clinic calls it);
    // it is NOT an identity check anymore — phone login was removed.
    const session = await getPatientSession();

    const result = await createBooking({
      serviceId: parsed.data.serviceId,
      doctorId: parsed.data.doctorId || undefined,
      appointmentDate: parsed.data.appointmentDate,
      startTime: parsed.data.startTime,
      patientId: session?.patientId,
      patient: {
        fullName: parsed.data.patient.fullName,
        phone: parsed.data.patient.phone,
        age: parsed.data.patient.age,
        gender: parsed.data.patient.gender,
        email: parsed.data.patient.email || undefined,
        notes: parsed.data.patient.notes || undefined,
      },
    });

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        SLOT_TAKEN: 409,
        BOOKING_DISABLED: 503,
        SERVICE: 404,
        RANGE: 400,
        VALIDATION: 400,
        NO_DOCTOR: 503,
        CODE_ERROR: 500,
      };
      const codeMap: Record<string, "CONFLICT_SLOT_TAKEN" | "BOOKING_DISABLED" | "VALIDATION_ERROR" | "NOT_FOUND" | "SERVER_ERROR"> = {
        SLOT_TAKEN: "CONFLICT_SLOT_TAKEN",
        BOOKING_DISABLED: "BOOKING_DISABLED",
        SERVICE: "NOT_FOUND",
        RANGE: "VALIDATION_ERROR",
        VALIDATION: "VALIDATION_ERROR",
        NO_DOCTOR: "SERVER_ERROR",
        CODE_ERROR: "SERVER_ERROR",
      };
      return apiError(codeMap[result.reason] ?? "SERVER_ERROR", result.message, statusMap[result.reason] ?? 500);
    }

    // If the booker was signed in, the appointment is already on their account.
    return apiOk({
      id: result.appointmentId,
      code: result.code,
      status: result.status,
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
