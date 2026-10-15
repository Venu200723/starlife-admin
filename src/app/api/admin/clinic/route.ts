// PUT /api/admin/clinic — edit clinic info and doctor profile.
// GET  /api/admin/clinic — the same aggregate the patient app's public
//   /api/clinic returns (info, doctor, hours, rules), but admin-session
//   gated. The Settings screen must use THIS endpoint: on the staff site
//   the public patient route does not exist, so loading from it 404s and
//   the screen never leaves its skeleton state.
// Product rule: professional details (bio, qualifications, specializations,
// experience) are admin-configurable. Clearing a field shows
// "Information coming soon" in the patient app — nothing is invented.
import { db } from "@/lib/db";
import { getPublicClinicData } from "@/lib/clinic-data";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getAdminSession } from "@/lib/session";

const clinicSchema = {
  name: (v: unknown) => typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 120,
  phone: (v: unknown) => typeof v === "string" && v.replace(/\D/g, "").length >= 10,
  address: (v: unknown) => typeof v === "string" && v.trim().length >= 5 && v.trim().length <= 300,
};

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    return apiOk(await getPublicClinicData());
  } catch (err) {
    return handleServerError(req, err);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiError("UNAUTHORIZED", "Admin access required.", 401);
    const body = (await req.json().catch(() => ({}))) as Record<string, Record<string, unknown>>;

    const clinic = await db.clinic.findFirst();
    const doctor = await db.doctor.findFirst();
    if (!clinic || !doctor) return apiError("SERVER_ERROR", "Clinic is not configured.", 500);

    if (body.clinic) {
      const c = body.clinic;
      if (c.name !== undefined && !clinicSchema.name(c.name)) {
        return apiError("VALIDATION_ERROR", "Clinic name is required.", 400);
      }
      if (c.phone !== undefined && !clinicSchema.phone(c.phone)) {
        return apiError("VALIDATION_ERROR", "Enter a valid clinic phone number.", 400);
      }
      if (c.address !== undefined && !clinicSchema.address(c.address)) {
        return apiError("VALIDATION_ERROR", "Clinic address is required.", 400);
      }
      await db.clinic.update({
        where: { id: clinic.id },
        data: {
          ...(c.name !== undefined ? { name: String(c.name).trim() } : {}),
          ...(c.phone !== undefined ? { phone: String(c.phone).trim() } : {}),
          ...(c.address !== undefined ? { address: String(c.address).trim() } : {}),
          ...(c.mapsUrl !== undefined ? { mapsUrl: c.mapsUrl ? String(c.mapsUrl).trim() : null } : {}),
          ...(c.description !== undefined ? { description: c.description ? String(c.description).trim() : null } : {}),
        },
      });
    }

    if (body.doctor) {
      const d = body.doctor;
      if (d.name !== undefined && (typeof d.name !== "string" || d.name.trim().length < 2)) {
        return apiError("VALIDATION_ERROR", "Doctor name is required.", 400);
      }
      const clean = (v: unknown) =>
        v === undefined ? undefined : typeof v === "string" && v.trim() ? v.trim() : null;
      await db.doctor.update({
        where: { id: doctor.id },
        data: {
          ...(d.name !== undefined ? { name: String(d.name).trim() } : {}),
          ...(d.bio !== undefined ? { bio: clean(d.bio) } : {}),
          ...(d.qualifications !== undefined ? { qualifications: clean(d.qualifications) } : {}),
          ...(d.specializations !== undefined ? { specializations: clean(d.specializations) } : {}),
          ...(d.experience !== undefined ? { experience: clean(d.experience) } : {}),
          ...(d.photoUrl !== undefined ? { photoUrl: clean(d.photoUrl) } : {}),
        },
      });
    }

    return apiOk({ saved: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
