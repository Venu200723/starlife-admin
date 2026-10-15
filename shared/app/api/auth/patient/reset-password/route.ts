// POST /api/auth/patient/reset-password — complete the password reset flow.
//
// Exchanges the one-time token from the forgot-password step for a new
// password. Where the credential lives depends on the account:
//  - Supabase Auth account (authUid set + Supabase configured): the new
//    password is pushed to auth.users via the service-role API.
//  - Local scrypt account: the scrypt hash is updated in place.
// Single-use: the token is cleared after a successful reset and expires
// after 15 minutes.
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseReady, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`preset:${clientIp(req)}`, 8, 15 * 60_000);
    if (!rl.ok) {
      return apiError("RATE_LIMITED", `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`, 429);
    }

    const parsed = resetPasswordSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Please check the entered details.", 400);
    }
    const { token, password } = parsed.data;

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const patient = await db.patient.findUnique({ where: { resetTokenHash: tokenHash } });
    if (!patient || !patient.resetExpiresAt || patient.resetExpiresAt.getTime() < Date.now()) {
      return apiError("VALIDATION_ERROR", "This reset link is invalid or has expired. Please request a new one.", 400);
    }

    if (patient.authUid && supabaseReady()) {
      // Credential lives in Supabase Auth — push the new password there.
      const su = await supabaseAdmin().auth.admin.updateUserById(patient.authUid, { password });
      if (su.error) {
        return apiError("SERVER_ERROR", "Could not update the password right now. Please try again.", 502);
      }
      // Keep the profile free of local credentials for Supabase accounts.
      await db.patient.update({
        where: { id: patient.id },
        data: { resetTokenHash: null, resetExpiresAt: null, passwordHash: null },
      });
    } else {
      await db.patient.update({
        where: { id: patient.id },
        data: {
          passwordHash: hashPassword(password),
          resetTokenHash: null,
          resetExpiresAt: null,
        },
      });
    }

    return apiOk({ reset: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
