// GET /api/clinic — public clinic aggregate (info, doctor, services, hours, live status).
import { getPublicClinicData } from "@/lib/clinic-data";
import { apiOk, handleServerError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const data = await getPublicClinicData();
    return apiOk(data);
  } catch (err) {
    return handleServerError(req, err);
  }
}
