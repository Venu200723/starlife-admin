// POST /api/auth/patient/login — sign in with email + password.
// Generic error message on failure to avoid account enumeration.
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { patientLoginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { issuePatientSession } from "@/lib/patient-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseReady, supabaseAnon } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const parsed = patientLoginSchema.safeParse(await req.json().catch(() => ({})));
    const email = parsed.success ? parsed.data.email : "";
    const rl = rateLimit(`plogin:${email}:${clientIp(req)}`, 8, 15 * 60_000);
    if (!rl.ok) {
      return apiError("RATE_LIMITED", `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`, 429);
    }
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Enter your email and password", 400);
    }

    if (supabaseReady()) {
      // Supabase Auth verifies the credential; the patient row is linked by
      // authUid (or email for accounts that predate Supabase).
      const su = await supabaseAnon().auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (su.error || !su.data.user) {
        // Not a Supabase credential. Accounts that live only in the local
        // database (guest bookings that later set a password through
        // forgot-password, or pre-Supabase accounts) must still sign in —
        // fall back to the local scrypt hash before rejecting.
        const local = await db.patient.findUnique({ where: { email: parsed.data.email } });
        if (!local || !local.passwordHash || !verifyPassword(parsed.data.password, local.passwordHash)) {
          return apiError("UNAUTHORIZED", "Incorrect email or password.", 401);
        }
        const session = await issuePatientSession(local);
        return apiOk(session);
      }
      let patient = await db.patient.findUnique({ where: { authUid: su.data.user.id } });
      if (!patient) {
        const byEmail = await db.patient.findUnique({ where: { email: parsed.data.email } });
        patient = byEmail
          ? await db.patient.update({ where: { id: byEmail.id }, data: { authUid: su.data.user.id } })
          : await db.patient.create({
              data: {
                authUid: su.data.user.id,
                email: parsed.data.email,
                fullName: (su.data.user.user_metadata?.full_name as string | undefined) ?? null,
              },
            });
      }
      const { token, patient: payload } = await issuePatientSession(patient);
      return apiOk({ patient: payload, token });
    }

    const patient = await db.patient.findUnique({ where: { email: parsed.data.email } });
    if (!patient || !patient.passwordHash || !verifyPassword(parsed.data.password, patient.passwordHash)) {
      // Same message whether the account is missing or the password is wrong —
      // no hints for account enumeration.
      return apiError("UNAUTHORIZED", "Incorrect email or password.", 401);
    }

    const { token, patient: payload } = await issuePatientSession(patient);
    // Dual-mode session: token returned for contexts where cookies are blocked.
    return apiOk({ patient: payload, token });
  } catch (err) {
    return handleServerError(req, err);
  }
}
