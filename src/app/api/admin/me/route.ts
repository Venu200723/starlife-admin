// GET /api/admin/me — admin session probe.
import { getAdminSession } from "@/lib/session";
import { apiOk, apiOkNull, handleServerError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return apiOkNull();
    return apiOk({ username: session.username, role: session.role });
  } catch (err) {
    return handleServerError(req, err);
  }
}
