// PUT /api/patient/profile — update patient's own profile.
// Phone can be backfilled once (while empty) — e.g. the number given when
// booking a consultation; afterwards it is fixed here and managed by the clinic.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getPatientSession } from "@/lib/session";
import { profileUpdateSchema, normalizeIndianPhone } from "@/lib/validation";

export async function PUT(req: Request) {
  try {
    const session = await getPatientSession();
    if (!session) return apiError("UNAUTHORIZED", "Please sign in first.", 401);
    const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Please check the entered details.";
      return apiError("VALIDATION_ERROR", msg, 400);
    }

    const existing = await db.patient.findUnique({ where: { id: session.patientId } });
    if (!existing) return apiError("UNAUTHORIZED", "Please sign in again.", 401);

    let phone: string | null = existing.phone;
    const wantedPhone = parsed.data.phone ? normalizeIndianPhone(parsed.data.phone) : null;
    if (!phone && wantedPhone) {
      const taken = await db.patient.findUnique({ where: { phone: wantedPhone } });
      if (taken) {
        return apiError("VALIDATION_ERROR", "This mobile number is already linked to another account.", 409);
      }
      phone = wantedPhone;
    }

    const patient = await db.patient.update({
      where: { id: session.patientId },
      data: {
        fullName: parsed.data.fullName,
        // email is the login identity — intentionally NOT editable here.
        email: existing.email,
        phone,
        age: parsed.data.age,
        gender: parsed.data.gender,
      },
    });
    return apiOk({
      id: patient.id,
      phone: patient.phone,
      fullName: patient.fullName,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
