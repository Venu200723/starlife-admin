// GET  /api/admin/doctors — all doctors (including inactive) with appointment counts.
// POST /api/admin/doctors — add a doctor to the clinic.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";
import { doctorSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const doctors = await db.doctor.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      include: { _count: { select: { appointments: true } } },
    });
    return apiOk({
      items: doctors.map((d) => ({
        id: d.id,
        name: d.name,
        photoUrl: d.photoUrl,
        bio: d.bio,
        qualifications: d.qualifications,
        specializations: d.specializations,
        experience: d.experience,
        isActive: d.isActive,
        appointmentCount: d._count.appointments,
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
    const parsed = doctorSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid doctor details", 400);
    }
    const clinic = await db.clinic.findFirst();
    if (!clinic) return apiError("SERVER_ERROR", "Clinic is not configured.", 500);
    const d = parsed.data;
    const created = await db.doctor.create({
      data: {
        clinicId: clinic.id,
        name: d.name,
        qualifications: d.qualifications || null,
        specializations: d.specializations || null,
        experience: d.experience || null,
        bio: d.bio || null,
        photoUrl: d.photoUrl || null,
        isActive: d.isActive,
      },
    });
    return apiOk({ id: created.id });
  } catch (err) {
    return handleServerError(req, err);
  }
}
