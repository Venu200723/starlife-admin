// GET /api/appointments/[id]/ics — "Add to Calendar" file (owner or code-holder).
import { db } from "@/lib/db";
import { getPatientSession } from "@/lib/session";
import { buildIcs } from "@/lib/ics";
import { handleServerError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getPatientSession();
    if (!session) return new Response("Unauthorized", { status: 401 });
    const { id } = await params;

    const appt = await db.appointment.findFirst({
      where: { id, patientId: session.patientId },
      include: {
        service: true,
        doctor: true,
        clinic: true,
      },
    });
    if (!appt) return new Response("Not found", { status: 404 });

    const ics = buildIcs({
      uid: appt.code,
      title: `${appt.service.name} – ${appt.doctor.name} @ ${appt.clinic.name}`,
      description: `Appointment ${appt.code}. Please arrive 10 minutes early. Clinic phone: ${appt.clinic.phone}`,
      location: appt.clinic.address,
      url: appt.clinic.mapsUrl ?? undefined,
      date: appt.appointmentDate,
      startTime: appt.startTime,
      endTime: appt.endTime,
      status: appt.status,
    });

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${appt.code}.ics"`,
      },
    });
  } catch (err) {
    return handleServerError(req, err);
  }
}
