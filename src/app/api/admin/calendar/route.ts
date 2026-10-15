// GET /api/admin/calendar?month=YYYY-MM — per-day booking counts + blocks.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);

    const month = new URL(req.url).searchParams.get("month") ?? "";
    if (!/^\d{4}-\d{2}$/.test(month)) return apiError("BAD_REQUEST", "month must be YYYY-MM", 400);

    const monthStart = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

    const [appts, blockedDates, blockedSlots] = await Promise.all([
      db.appointment.groupBy({
        by: ["appointmentDate", "status"],
        where: { appointmentDate: { gte: monthStart, lte: monthEnd } },
        _count: { _all: true },
      }),
      db.blockedDate.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
      db.blockedSlot.findMany({ where: { date: { gte: monthStart, lte: monthEnd } }, orderBy: { startTime: "asc" } }),
    ]);

    const dayMap = new Map<string, { total: number; pending: number; confirmed: number; completed: number }>();
    for (const row of appts) {
      const entry = dayMap.get(row.appointmentDate) ?? { total: 0, pending: 0, confirmed: 0, completed: 0 };
      entry.total += row._count._all;
      if (row.status === "PENDING") entry.pending += row._count._all;
      if (row.status === "CONFIRMED") entry.confirmed += row._count._all;
      if (row.status === "COMPLETED") entry.completed += row._count._all;
      dayMap.set(row.appointmentDate, entry);
    }

    const days = Array.from({ length: lastDay }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, "0")}`;
      return {
        date,
        ...(dayMap.get(date) ?? { total: 0, pending: 0, confirmed: 0, completed: 0 }),
        blockedDate: blockedDates.find((b) => b.date === date)?.reason ?? null,
      };
    });

    return apiOk({
      month,
      days,
      blockedSlots: blockedSlots.map((b) => ({
        id: b.id,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason,
      })),
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
