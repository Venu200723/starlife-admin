// PATCH  /api/admin/doctors/[id] — edit a doctor (fields and active state).
// DELETE /api/admin/doctors/[id] — delete only when no appointment history
//   references the doctor; otherwise the client is told to deactivate.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { doctorSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const { id } = await params;
    const parsed = doctorSchema.partial().safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid doctor details", 400);
    }
    const existing = await db.doctor.findUnique({ where: { id } });
    if (!existing) return apiError("NOT_FOUND", "Doctor not found.", 404);
    const d = parsed.data;
    await db.doctor.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.qualifications !== undefined ? { qualifications: d.qualifications || null } : {}),
        ...(d.specializations !== undefined ? { specializations: d.specializations || null } : {}),
        ...(d.experience !== undefined ? { experience: d.experience || null } : {}),
        ...(d.bio !== undefined ? { bio: d.bio || null } : {}),
        ...(d.photoUrl !== undefined ? { photoUrl: d.photoUrl || null } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
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
    const existing = await db.doctor.findUnique({
      where: { id },
      include: { _count: { select: { appointments: true } } },
    });
    if (!existing) return apiError("NOT_FOUND", "Doctor not found.", 404);
    if (existing._count.appointments > 0) {
      return apiError(
        "VALIDATION_ERROR",
        "This doctor has appointment history and cannot be deleted. Deactivate the doctor instead.",
        409,
      );
    }
    await db.doctor.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
