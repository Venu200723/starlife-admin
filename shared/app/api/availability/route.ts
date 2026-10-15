// GET /api/availability?date=YYYY-MM-DD&serviceId=... — bookable slots for a date.
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { generateSlots } from "@/lib/slots";
import { getZonedNow, addDays, compareDates } from "@/lib/time";
import { apiOk, apiError, handleServerError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? "";
    const serviceId = url.searchParams.get("serviceId") ?? "";
    const doctorIdParam = url.searchParams.get("doctorId") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !serviceId) {
      return apiError("BAD_REQUEST", "date and serviceId are required", 400);
    }

    const clinic = await db.clinic.findFirst();
    const service = await db.service.findFirst({ where: { id: serviceId, isActive: true } });
    if (!clinic || !service) {
      return apiError("NOT_FOUND", "Clinic or service not found", 404);
    }

    // Multi-doctor: slots are per doctor. Defaults to the clinic's first
    // active doctor so single-doctor clients keep working unchanged.
    const doctor = doctorIdParam
      ? await db.doctor.findFirst({ where: { id: doctorIdParam, clinicId: clinic.id, isActive: true } })
      : await db.doctor.findFirst({ where: { clinicId: clinic.id, isActive: true }, orderBy: { createdAt: "asc" } });
    if (!doctor) {
      return apiError("NOT_FOUND", "Doctor not found", 404);
    }

    const settings = await getSettings();
    const now = getZonedNow(clinic.timezone);
    const maxDate = addDays(now.dateStr, settings.maxAdvanceDays);
    if (compareDates(date, now.dateStr) < 0 || compareDates(date, maxDate) > 0) {
      return apiOk({ date, closed: true, closedReason: "OUT_OF_RANGE", slots: [] });
    }

    const weekday = new Date(`${date}T12:00:00+05:30`).getUTCDay();
    const [hours, blockedDates, blockedSlots, appointments] = await Promise.all([
      db.clinicHour.findUnique({ where: { clinicId_dayOfWeek: { clinicId: clinic.id, dayOfWeek: weekday } } }),
      db.blockedDate.findMany({ where: { clinicId: clinic.id } }),
      db.blockedSlot.findMany({ where: { clinicId: clinic.id, date } }),
      db.appointment.findMany({
        where: {
          clinicId: clinic.id,
          doctorId: doctor.id,
          appointmentDate: date,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { appointmentDate: true, startTime: true, endTime: true, status: true },
      }),
    ]);

    const result = generateSlots({
      date,
      hours: hours ?? null,
      blockedDates,
      blockedSlots,
      appointments,
      serviceDurationMinutes: service.durationMinutes,
      slotStepMinutes: settings.slotStepMinutes,
      now: { dateStr: now.dateStr, minutes: now.minutes },
    });

    return apiOk({
      date,
      doctorId: doctor.id,
      doctorName: doctor.name,
      serviceDurationMinutes: service.durationMinutes,
      ...result,
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
