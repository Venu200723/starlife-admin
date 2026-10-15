// GET /api/admin/overview — dashboard stat cards + today's appointments + activity.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { getZonedNow, addDays, compareDates } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);

    const now = getZonedNow();
    const tomorrow = addDays(now.dateStr, 1);
    const weekAgo = addDays(now.dateStr, -7);

    const [todayAppts, pendingAll, blockedCount, analytics] = await Promise.all([
      db.appointment.findMany({
        where: { appointmentDate: { gte: now.dateStr, lte: tomorrow } },
        include: {
          patient: { select: { fullName: true, phone: true } },
          service: { select: { name: true } },
        },
        orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
      }),
      db.appointment.count({ where: { status: "PENDING" } }),
      db.blockedDate.count({ where: { date: { gte: now.dateStr } } }),
      db.analyticsEvent.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
        select: { type: true },
      }),
    ]);

    const todayRows = todayAppts.filter((a) => a.appointmentDate === now.dateStr);
    const tomorrowRows = todayAppts.filter((a) => a.appointmentDate === tomorrow);
    const stats = {
      todayTotal: todayRows.length,
      pending: pendingAll,
      confirmed: todayRows.filter((a) => a.status === "CONFIRMED").length,
      completed: todayRows.filter((a) => a.status === "COMPLETED").length,
      cancelled: todayRows.filter((a) => a.status === "CANCELLED").length,
      tomorrowTotal: tomorrowRows.length,
      upcomingBlocked: blockedCount,
    };

    const activity: Record<string, number> = {};
    for (const ev of analytics) activity[ev.type] = (activity[ev.type] ?? 0) + 1;

    const appointments = todayAppts.map((a) => ({
      id: a.id,
      code: a.code,
      appointmentDate: a.appointmentDate,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      isToday: a.appointmentDate === now.dateStr,
      isPast: compareDates(a.appointmentDate, now.dateStr) < 0,
      patientName: a.patient.fullName ?? "Unknown",
      patientPhone: a.contactPhone ?? a.patient.phone,
      serviceName: a.service.name,
      patientNotes: a.patientNotes,
    }));

    return apiOk({ today: now.dateStr, stats, appointments, activity });
  } catch (err) {
    return handleServerError(req, err);
  }
}
