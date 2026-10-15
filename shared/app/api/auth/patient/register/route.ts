// POST /api/auth/patient/register — create an account with email + password.
// Supabase Auth (when configured) stores the credential; otherwise scrypt in
// the local database (same scheme as staff accounts). Both paths issue the
// same aud-bound session.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { patientRegisterSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { issuePatientSession } from "@/lib/patient-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseReady, supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`pregister:${clientIp(req)}`, 8, 15 * 60_000);
    if (!rl.ok) {
      return apiError("RATE_LIMITED", `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`, 429);
    }

    const parsed = patientRegisterSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Please check the entered details.", 400);
    }
    const { fullName, email, password } = parsed.data;

    if (supabaseReady()) {
      // Supabase Auth stores the credential. Service role provisions the user
      // with email already confirmed (the clinic app signs in immediately).
      const existing = await db.patient.findUnique({ where: { email } });
      if (existing) {
        return apiError("VALIDATION_ERROR", "An account with this email already exists. Please sign in instead.", 409);
      }
      const su = await supabaseAdmin().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (su.error || !su.data.user) {
        const msg = su.error?.message ?? "";
        if (/already|registered|exists/i.test(msg)) {
          return apiError("VALIDATION_ERROR", "An account with this email already exists. Please sign in instead.", 409);
        }
        return apiError("VALIDATION_ERROR", "Could not create the account right now. Please try again.", 502);
      }
      const patient = await db.patient.create({ data: { authUid: su.data.user.id, fullName, email } });
      const { token, patient: payload } = await issuePatientSession(patient);
      return apiOk({ patient: payload, token });
    }

    const existing = await db.patient.findUnique({ where: { email } });
    if (existing) {
      return apiError("VALIDATION_ERROR", "An account with this email already exists. Please sign in instead.", 409);
    }

    const patient = await db.patient.create({
      data: {
        fullName,
        email,
        passwordHash: hashPassword(password),
      },
    });

    const { token, patient: payload } = await issuePatientSession(patient);
    // Dual-mode session: token returned for contexts where cookies are blocked.
    return apiOk({ patient: payload, token });
  } catch (err) {
    return handleServerError(req, err);
  }
}
