// PATCH  /api/admin/services/[id] — edit a service.
// DELETE /api/admin/services/[id] — delete if unused, otherwise suggest deactivating.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { serviceSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const { id } = await params;
    const parsed = serviceSchema.partial().safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid service", 400);
    }
    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) return apiError("NOT_FOUND", "Service not found.", 404);
    await db.service.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
        ...(parsed.data.durationMinutes !== undefined ? { durationMinutes: parsed.data.durationMinutes } : {}),
        ...(parsed.data.price !== undefined ? { price: parsed.data.price ?? null } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });
    return apiOk({ updated: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const { id } = await params;
    const count = await db.appointment.count({ where: { serviceId: id } });
    if (count > 0) {
      return apiError(
        "CONFLICT_SLOT_TAKEN",
        "This service has appointments linked to it. Deactivate it instead of deleting.",
        409,
      );
    }
    await db.service.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
