// POST /api/auth/patient/logout
import { clearPatientCookie } from "@/lib/session";
import { apiOk, handleServerError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    await clearPatientCookie();
    return apiOk({ signedOut: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
