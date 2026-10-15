// GET /api/admin/appointments — searchable, filterable appointment list.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { APPOINTMENT_STATUSES } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "";
    const date = url.searchParams.get("date") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("pageSize") ?? "20") || 20));

    const where: Record<string, unknown> = {};
    if (status && (APPOINTMENT_STATUSES as readonly string[]).includes(status)) where.status = status;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) where.appointmentDate = date;
    else {
      const range: Record<string, string> = {};
      if (/^\d{4}-\d{2}-\d{2}$/.test(from)) range.gte = from;
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) range.lte = to;
      if (Object.keys(range).length) where.appointmentDate = range;
    }
    if (q) {
      where.OR = [
        { code: { contains: q } },
        { patientNotes: { contains: q } },
        { patient: { is: { fullName: { contains: q } } } },
        { patient: { is: { phone: { contains: q } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      db.appointment.count({ where }),
      db.appointment.findMany({
        where,
        include: {
          patient: { select: { fullName: true, phone: true, age: true, gender: true } },
          service: { select: { name: true } },
        },
        orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return apiOk({
      total,
      page,
      pageSize,
      items: rows.map((a) => ({
        id: a.id,
        code: a.code,
        appointmentDate: a.appointmentDate,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        patientNotes: a.patientNotes,
        adminNotes: a.adminNotes,
        patientName: a.patient.fullName ?? "Unknown",
        patientPhone: a.contactPhone ?? a.patient.phone,
        patientAge: a.patient.age,
        patientGender: a.patient.gender,
        serviceName: a.service.name,
      })),
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
