// GET    /api/admin/blocks?date=YYYY-MM-DD — blocks + appointments for one day.
// POST   /api/admin/blocks — block a full date or a time range.
// DELETE /api/admin/blocks?type=date|slot&id=...
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { blockDateSchema, blockSlotSchema } from "@/lib/validation";
import { timeToMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const date = new URL(req.url).searchParams.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return apiError("BAD_REQUEST", "date required", 400);

    const [blockedDate, blockedSlots, appointments] = await Promise.all([
      db.blockedDate.findUnique({ where: { clinicId_date: { clinicId: await clinicId(), date } } }),
      db.blockedSlot.findMany({ where: { date }, orderBy: { startTime: "asc" } }),
      db.appointment.findMany({
        where: { appointmentDate: date, status: { in: ["PENDING", "CONFIRMED"] } },
        include: {
          patient: { select: { fullName: true, phone: true } },
          service: { select: { name: true } },
        },
        orderBy: { startTime: "asc" },
      }),
    ]);
    return apiOk({
      blockedDate: blockedDate ? { id: blockedDate.id, reason: blockedDate.reason } : null,
      blockedSlots: blockedSlots.map((b) => ({ id: b.id, startTime: b.startTime, endTime: b.endTime, reason: b.reason })),
      appointments: appointments.map((a) => ({
        id: a.id,
        code: a.code,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        patientName: a.patient.fullName ?? "Unknown",
        patientPhone: a.contactPhone ?? a.patient.phone,
        serviceName: a.service.name,
      })),
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const body = await req.json().catch(() => ({}));

    if (body?.type === "date") {
      const parsed = blockDateSchema.safeParse(body);
      if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid block", 400);
      const cid = await clinicId();
      const row = await db.blockedDate.upsert({
        where: { clinicId_date: { clinicId: cid, date: parsed.data.date } },
        update: { reason: parsed.data.reason ?? null },
        create: { clinicId: cid, date: parsed.data.date, reason: parsed.data.reason ?? null },
      });
      return apiOk({ id: row.id });
    }

    if (body?.type === "slot") {
      const parsed = blockSlotSchema.safeParse(body);
      if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid block", 400);
      if (timeToMinutes(parsed.data.endTime) <= timeToMinutes(parsed.data.startTime)) {
        return apiError("VALIDATION_ERROR", "End time must be after start time.", 400);
      }
      const row = await db.blockedSlot.create({
        data: {
          clinicId: await clinicId(),
          date: parsed.data.date,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          reason: parsed.data.reason ?? null,
        },
      });
      return apiOk({ id: row.id });
    }

    return apiError("BAD_REQUEST", "Unknown block type", 400);
  } catch (err) {
    return handleServerError(req, err);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const id = url.searchParams.get("id") ?? "";
    if (!id) return apiError("BAD_REQUEST", "id required", 400);
    if (type === "date") await db.blockedDate.delete({ where: { id } });
    else if (type === "slot") await db.blockedSlot.delete({ where: { id } });
    else return apiError("BAD_REQUEST", "type must be date or slot", 400);
    return apiOk({ removed: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}

async function clinicId(): Promise<string> {
  const clinic = await db.clinic.findFirst();
  if (!clinic) throw new Error("Clinic not configured");
  return clinic.id;
}
