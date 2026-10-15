// GET  /api/patient/notifications — the patient's in-app notifications.
// POST /api/patient/notifications — mark read ({ all: true } | { ids: [...] }).
import { db } from "@/lib/db";
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getPatientSession } from "@/lib/session";
import { generateDueReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getPatientSession();
    if (!session) return apiError("UNAUTHORIZED", "Please sign in first.", 401);
    await generateDueReminders(session.patientId).catch(() => undefined);
    const [items, unread] = await Promise.all([
      db.notification.findMany({
        where: { patientId: session.patientId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.notification.count({ where: { patientId: session.patientId, read: false } }),
    ]);
    return apiOk({ items, unread });
  } catch (err) {
    return handleServerError(req, err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getPatientSession();
    if (!session) return apiError("UNAUTHORIZED", "Please sign in first.", 401);
    const body = (await req.json().catch(() => ({}))) as { all?: boolean; ids?: string[] };
    if (body.all) {
      await db.notification.updateMany({
        where: { patientId: session.patientId, read: false },
        data: { read: true },
      });
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await db.notification.updateMany({
        where: { patientId: session.patientId, id: { in: body.ids } },
        data: { read: true },
      });
    } else {
      return apiError("BAD_REQUEST", "Nothing to mark read", 400);
    }
    const unread = await db.notification.count({
      where: { patientId: session.patientId, read: false },
    });
    return apiOk({ unread });
  } catch (err) {
    return handleServerError(req, err);
  }
}
