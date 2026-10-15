// POST /api/analytics — privacy-conscious event capture (no personal data).
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { apiOk, handleServerError } from "@/lib/api";

const ALLOWED = new Set([
  "APP_OPENED",
  "BOOKING_STARTED",
  "BOOKING_COMPLETED",
  "APPOINTMENT_CANCELLED",
  "DIRECTIONS_CLICKED",
  "CALL_CLICKED",
]);

export async function POST(req: Request) {
  try {
    const settings = await getSettings();
    if (!settings.analyticsEnabled) return apiOk({ recorded: false });
    const body = (await req.json().catch(() => ({}))) as { type?: string };
    if (!body.type || !ALLOWED.has(body.type)) return apiOk({ recorded: false });
    await db.analyticsEvent.create({ data: { type: body.type } });
    return apiOk({ recorded: true });
  } catch (err) {
    return handleServerError(req, err);
  }
}
