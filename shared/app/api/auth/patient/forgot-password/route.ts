// POST /api/auth/patient/forgot-password — start the password reset flow.
//
// Issues a one-time reset token (SHA-256 stored on the profile, 15-minute
// expiry) that works in BOTH auth modes: the reset step pushes the new
// password to Supabase Auth when the account lives there, or updates the
// local scrypt hash otherwise.
//
// Email delivery uses the same demo-reveal pattern: when EMAIL_PROVIDER_KEY
// is set the same token would be emailed by the provider integration (hook
// point below); without it, demo mode returns the reset link in the API
// response so the flow is usable end-to-end. Production mode never returns
// the link — the generic response prevents account enumeration.
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const TOKEN_TTL_MS = 15 * 60_000;

/** The URL patients open to set a new password. Prefers an explicit origin
 *  env (set it in production), then the browser's Origin header (present on
 *  same-origin POST fetches), then forwarded/host headers. Origin first
 *  because behind preview gateways/tunnels x-forwarded-host can name an
 *  internal upstream host that is not reachable from the patient's device. */
function resetOrigin(req: Request): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`pforgot:${clientIp(req)}`, 5, 15 * 60_000);
    if (!rl.ok) {
      return apiError("RATE_LIMITED", `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`, 429);
    }

    const parsed = forgotPasswordSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Enter a valid email address.", 400);
    }
    const { email } = parsed.data;

    const patient = await db.patient.findUnique({ where: { email } });
    if (!patient) {
      // Generic response — do not reveal whether the account exists.
      return apiOk({ sent: true });
    }

    const token = randomBytes(32).toString("hex");
    await db.patient.update({
      where: { id: patient.id },
      data: {
        resetTokenHash: createHash("sha256").update(token).digest("hex"),
        resetExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${resetOrigin(req)}/reset-password?token=${token}`;

    // Production hook point: when EMAIL_PROVIDER_KEY is configured, send
    // resetUrl (or a branded page wrapping it) to `email` via the provider
    // and drop the `resetUrl` field from the response. Demo mode returns it
    // so the flow is testable without mail infrastructure.
    const demo = !process.env.EMAIL_PROVIDER_KEY;
    return apiOk({ sent: true, ...(demo ? { demo: true, resetUrl } : {}) });
  } catch (err) {
    return handleServerError(req, err);
  }
}
