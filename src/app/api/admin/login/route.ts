// POST /api/admin/login — staff sign-in (credentials from env-seeded admin row).
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { adminLoginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { setAdminCookie } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`adminlogin:${clientIp(req)}`, 8, 15 * 60_000);
    if (!rl.ok) {
      return apiError("RATE_LIMITED", `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`, 429);
    }

    const parsed = adminLoginSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Enter username and password", 400);

    const admin = await db.admin.findUnique({ where: { username: parsed.data.username.trim() } });
    if (!admin || !verifyPassword(parsed.data.password, admin.passwordHash)) {
      return apiError("UNAUTHORIZED", "Incorrect username or password.", 401);
    }

    const token = await setAdminCookie(admin.id, admin.username, admin.role);
    // Dual-mode session: token returned for contexts where cookies are blocked.
    return apiOk({ username: admin.username, role: admin.role, token });
  } catch (err) {
    return handleServerError(req, err);
  }
}
