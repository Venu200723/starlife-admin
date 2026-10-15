// PUT /api/admin/hours — replace the 7-day schedule.
// Prevents invalid configs (closing <= opening) that would break availability.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { timeToMinutes } from "@/lib/time";

interface HourRow {
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
}

export async function PUT(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const body = (await req.json().catch(() => ({}))) as { hours?: HourRow[] };
    const hours = body.hours;
    if (!Array.isArray(hours) || hours.length !== 7) {
      return apiError("VALIDATION_ERROR", "Provide all 7 days.", 400);
    }
    const clinic = await db.clinic.findFirst();
    if (!clinic) return apiError("SERVER_ERROR", "Clinic is not configured.", 500);

    const seen = new Set<number>();
    for (const row of hours) {
      if (!Number.isInteger(row.dayOfWeek) || row.dayOfWeek < 0 || row.dayOfWeek > 6 || seen.has(row.dayOfWeek)) {
        return apiError("VALIDATION_ERROR", "Each weekday must appear exactly once.", 400);
      }
      seen.add(row.dayOfWeek);
      if (!row.isOpen) continue;
      const open = timeToMinutes(String(row.openingTime ?? ""));
      const close = timeToMinutes(String(row.closingTime ?? ""));
      if (Number.isNaN(open) || Number.isNaN(close) || close <= open) {
        return apiError("VALIDATION_ERROR", "Closing time must be after opening time.", 400);
      }
    }

    await db.$transaction(
      hours.map((row) =>
        db.clinicHour.upsert({
          where: { clinicId_dayOfWeek: { clinicId: clinic.id, dayOfWeek: row.dayOfWeek } },
          update: {
            openingTime: String(row.openingTime),
            closingTime: String(row.closingTime),
            isOpen: !!row.isOpen,
          },
          create: {
            clinicId: clinic.id,
            dayOfWeek: row.dayOfWeek,
            openingTime: String(row.openingTime),
            closingTime: String(row.closingTime),
            isOpen: !!row.isOpen,
          },
        }),
      ),
    );
    return apiOk({ saved: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
