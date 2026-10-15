// GET  /api/admin/services — all services (including inactive).
// POST /api/admin/services — create a service.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { serviceSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const services = await db.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return apiOk({
      items: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        isActive: s.isActive,
        isDemo: s.isDemo,
        appointmentCount: undefined as number | undefined,
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
    const parsed = serviceSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid service", 400);
    }
    const clinic = await db.clinic.findFirst();
    if (!clinic) return apiError("SERVER_ERROR", "Clinic is not configured.", 500);
    const maxOrder = await db.service.aggregate({ _max: { sortOrder: true } });
    const created = await db.service.create({
      data: {
        clinicId: clinic.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        durationMinutes: parsed.data.durationMinutes,
        price: parsed.data.price ?? null,
        isActive: parsed.data.isActive,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return apiOk({ id: created.id });
  } catch (err) {
    return handleServerError(req, err);
  }
}
