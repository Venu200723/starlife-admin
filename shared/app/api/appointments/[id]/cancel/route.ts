// POST /api/appointments/[id]/cancel — patient cancellation (clinic cutoff rules apply).
import { apiOk, apiError, handleServerError } from "@/lib/api";
import { getPatientSession } from "@/lib/session";
import { cancelAppointmentByPatient } from "@/lib/booking";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getPatientSession();
    if (!session) return apiError("UNAUTHORIZED", "Please sign in first.", 401);
    const rl = rateLimit(`cancel:${clientIp(req)}`, 20, 60 * 60_000);
    if (!rl.ok) return apiError("RATE_LIMITED", "Too many attempts. Please try again later.", 429);

    const { id } = await params;
    const result = await cancelAppointmentByPatient(id, session.patientId);
    if (!result.ok) {
      if (result.status === 404) return apiError("NOT_FOUND", result.message, 404);
      if ("code" in result && result.code === "CANCEL_TOO_LATE") {
        return apiError("CANCEL_TOO_LATE", result.message, 409);
      }
      return apiError("BAD_REQUEST", result.message, result.status);
    }
    return apiOk({ status: result.appointment.status });
  } catch (err) {
    return handleServerError(req, err);
  }
}
