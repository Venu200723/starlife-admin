// POST /api/admin/logout
import { clearAdminCookie } from "@/lib/session";
import { apiOk, handleServerError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    await clearAdminCookie();
    return apiOk({ signedOut: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
