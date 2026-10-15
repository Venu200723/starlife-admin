// GET /api/admin/patients — minimal patient directory for appointment management.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();

    const patients = await db.patient.findMany({
      where: q
        ? {
            OR: [{ fullName: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }],
          }
        : undefined,
      include: {
        appointments: {
          orderBy: { createdAt: "desc" },
          select: { appointmentDate: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return apiOk({
      items: patients.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        phone: p.phone,
        email: p.email,
        age: p.age,
        gender: p.gender,
        appointmentCount: p.appointments.length,
        lastAppointmentDate: p.appointments[0]?.appointmentDate ?? null,
      })),
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
