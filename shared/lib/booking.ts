// Server-side booking service — the single write path for appointments.
// Defensive by design: re-validates the slot server-side (never trusts the
// client), runs in a transaction, and relies on a DB unique constraint as the
// final guard against race-condition double bookings.
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { getZonedNow, addDays, compareDates, minutesToTime, timeToMinutes } from "./time";
import { generateSlots } from "./slots";
import { normalizeIndianPhone } from "./validation";
import { createNotification } from "./notifications";

export interface BookingInput {
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  /** Optional doctor preference (multi-doctor clinics). Defaults to the
   *  clinic's first active doctor. */
  doctorId?: string;
  patient: {
    fullName: string;
    phone: string;
    age: number;
    gender: string;
    email?: string;
    notes?: string;
  };
  /** Signed-in booker: attach the appointment to this account. */
  patientId?: string;
}

export type BookingResult =
  | { ok: true; appointmentId: string; code: string; status: string }
  | { ok: false; reason: "VALIDATION" | "SERVICE" | "RANGE" | "SLOT_TAKEN" | "BOOKING_DISABLED" | "NO_DOCTOR" | "CODE_ERROR"; message: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function generateCode(dateStr: string, seq: number): string {
  return `SL-${dateStr.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`;
}

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const settings = await getSettings();
  if (!settings.bookingEnabled) {
    return { ok: false, reason: "BOOKING_DISABLED", message: "Online booking is temporarily unavailable. Please call the clinic." };
  }

  const { appointmentDate, startTime } = input;
  if (!DATE_RE.test(appointmentDate) || !TIME_RE.test(startTime)) {
    return { ok: false, reason: "VALIDATION", message: "Invalid date or time." };
  }

  const now = getZonedNow();

  // Date must be today..today+maxAdvanceDays (clinic-local)
  const maxDate = addDays(now.dateStr, settings.maxAdvanceDays);
  if (compareDates(appointmentDate, now.dateStr) < 0 || compareDates(appointmentDate, maxDate) > 0) {
    return { ok: false, reason: "RANGE", message: "Please choose a date within the booking window." };
  }

  const service = await db.service.findFirst({ where: { id: input.serviceId, isActive: true } });
  if (!service) {
    return { ok: false, reason: "SERVICE", message: "That service is not available. Please refresh and try again." };
  }

  const clinic = await db.clinic.findFirst();
  if (!clinic) return { ok: false, reason: "VALIDATION", message: "Clinic is not configured." };
  const doctor = input.doctorId
    ? await db.doctor.findFirst({ where: { id: input.doctorId, clinicId: clinic.id, isActive: true } })
    : await db.doctor.findFirst({ where: { clinicId: clinic.id, isActive: true }, orderBy: { createdAt: "asc" } });
  if (!doctor) {
    return {
      ok: false,
      reason: "NO_DOCTOR",
      message: input.doctorId
        ? "That doctor is not available for booking. Please choose another doctor."
        : "No doctor is configured. Please contact the clinic.",
    };
  }

  // Re-derive availability server-side (authoritative).
  const weekday = new Date(`${appointmentDate}T12:00:00+05:30`).getUTCDay();
  const hours = await db.clinicHour.findUnique({
    where: { clinicId_dayOfWeek: { clinicId: clinic.id, dayOfWeek: weekday } },
  });
  const [blockedDates, blockedSlots, sameDayAppointments] = await Promise.all([
    db.blockedDate.findMany({ where: { clinicId: clinic.id } }),
    db.blockedSlot.findMany({ where: { clinicId: clinic.id } }),
    db.appointment.findMany({
      where: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        appointmentDate,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { appointmentDate: true, startTime: true, endTime: true, status: true },
    }),
  ]);

  const { slots } = generateSlots({
    date: appointmentDate,
    hours: hours ?? null,
    blockedDates,
    blockedSlots,
    appointments: sameDayAppointments,
    serviceDurationMinutes: service.durationMinutes,
    slotStepMinutes: settings.slotStepMinutes,
    now: { dateStr: now.dateStr, minutes: now.minutes },
  });

  const slot = slots.find((s) => s.start === startTime);
  if (!slot || !slot.available) {
    return {
      ok: false,
      reason: "SLOT_TAKEN",
      message: "That appointment slot was just taken. Please choose another time.",
    };
  }
  const endTime = minutesToTime(timeToMinutes(startTime) + service.durationMinutes);

  // Contact number for THIS consultation (the clinic calls this number).
  // Phone is no longer a login method — it is simply captured at booking.
  const phone = normalizeIndianPhone(input.patient.phone);
  if (!phone) return { ok: false, reason: "VALIDATION", message: "Enter a valid 10-digit Indian mobile number." };

  let patient: Awaited<ReturnType<typeof db.patient.findUnique>>;
  if (input.patientId) {
    // Signed-in booker: the appointment belongs to their account. The number
    // given here is stored as the appointment contact and backfills the
    // profile phone once, if the profile has none yet.
    patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) {
      return { ok: false, reason: "VALIDATION", message: "Your session has expired. Please sign in again." };
    }
    if (!patient.phone) {
      const taken = await db.patient.findUnique({ where: { phone } });
      if (!taken) {
        patient = await db.patient.update({ where: { id: patient.id }, data: { phone } });
      }
    }
  } else {
    // Guest booking: attach to an existing profile when the phone or the
    // email already belongs to someone (e.g. a registered patient booking
    // without signing in), otherwise create one. Email and phone are both
    // unique columns, so a blind upsert keyed on phone crashes with a
    // P2002 on email whenever the email matches a different profile.
    // Existing identity fields are never clobbered — the number entered
    // here is stored per-appointment as contactPhone anyway.
    const byPhone = await db.patient.findUnique({ where: { phone } });
    const existing =
      byPhone ??
      (input.patient.email
        ? await db.patient.findUnique({ where: { email: input.patient.email } })
        : null);

    if (existing) {
      patient = await db.patient.update({
        where: { id: existing.id },
        data: {
          fullName: input.patient.fullName,
          age: input.patient.age,
          gender: input.patient.gender,
          ...(existing.phone ? {} : { phone }),
          ...(existing.email || !input.patient.email ? {} : { email: input.patient.email }),
        },
      });
    } else {
      patient = await db.patient.create({
        data: {
          phone,
          fullName: input.patient.fullName,
          age: input.patient.age,
          gender: input.patient.gender,
          email: input.patient.email || null,
        },
      });
    }
  }

  const status = settings.autoConfirm ? "CONFIRMED" : "PENDING";
  const slotKey = `${doctor.id}|${appointmentDate}|${startTime}`;

  // Create inside a transaction; unique constraints are the final race guard:
  //  - slotKey (doctor|date|start) -> slot (NULL when terminal, so cancelled
  //    slots become bookable again)
  //  - code -> sequence collisions on concurrent bookings
  for (let attempt = 0; attempt < 5; attempt++) {
    const seq =
      (await db.appointment.count({ where: { appointmentDate } })) + 1 + attempt;
    try {
      const created = await db.$transaction(async (tx) => {
        return tx.appointment.create({
          data: {
            clinicId: clinic.id,
            doctorId: doctor.id,
            serviceId: service.id,
            patientId: patient.id,
            code: generateCode(appointmentDate, seq),
            appointmentDate,
            startTime,
            endTime,
            status,
            slotKey,
            contactPhone: phone,
            patientNotes: input.patient.notes || null,
          },
        });
      });

      await createNotification(
        patient.id,
        status === "CONFIRMED" ? "Appointment confirmed" : "Appointment request received",
        status === "CONFIRMED"
          ? `Your appointment at STAR LIFE Clinic (${created.code}) is confirmed.`
          : `Your appointment request at STAR LIFE Clinic (${created.code}) has been received. The clinic will confirm it shortly.`,
        "BOOKING",
        created.id,
      );
      return { ok: true, appointmentId: created.id, code: created.code, status };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = JSON.stringify((err.meta as { target?: unknown } | undefined)?.target ?? "");
        if (target.includes("slotKey")) {
          return {
            ok: false,
            reason: "SLOT_TAKEN",
            message: "That appointment slot was just taken. Please choose another time.",
          };
        }
        continue; // code collision — retry with next sequence number
      }
      throw err;
    }
  }
  return { ok: false, reason: "CODE_ERROR", message: "Could not allocate an appointment ID. Please try again." };
}

/** Statuses that keep holding the slot (participate in uniqueness). */
export const ACTIVE_STATUSES = ["PENDING", "CONFIRMED"];

/** Re-activating a slot: verify no other active appointment overlaps first. */
export async function claimSlotOrConflict(
  appointmentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const appt = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) return { ok: false, message: "Appointment not found." };
  if (ACTIVE_STATUSES.includes(appt.status)) return { ok: true }; // already holds its slot

  const conflict = await db.appointment.findFirst({
    where: {
      slotKey: `${appt.doctorId}|${appt.appointmentDate}|${appt.startTime}`,
      status: { in: ACTIVE_STATUSES },
    },
  });
  if (conflict) {
    return { ok: false, message: "That slot is already held by another appointment." };
  }
  return { ok: true };
}

/** Patient-side cancellation with clinic cutoff rules. */
export async function cancelAppointmentByPatient(appointmentId: string, patientId: string) {
  const settings = await getSettings();
  const appt = await db.appointment.findFirst({
    where: { id: appointmentId, patientId },
    include: { service: true },
  });
  if (!appt) return { ok: false as const, status: 404, message: "Appointment not found." };
  if (!["PENDING", "CONFIRMED"].includes(appt.status)) {
    return { ok: false as const, status: 400, message: "This appointment can no longer be cancelled." };
  }
  const epoch = new Date(`${appt.appointmentDate}T${appt.startTime}:00+05:30`).getTime();
  const cutoffMs = settings.cancellationCutoffHours * 3600_000;
  if (Date.now() > epoch - cutoffMs) {
    return {
      ok: false as const,
      status: 409,
      code: "CANCEL_TOO_LATE",
      message: `Appointments can only be cancelled up to ${settings.cancellationCutoffHours} hour${settings.cancellationCutoffHours === 1 ? "" : "s"} before the start time. Please call the clinic.`,
    };
  }
  const updated = await db.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED", slotKey: null },
  });
  await createNotification(
    patientId,
    "Appointment cancelled",
    `Your appointment request (${appt.code}) for ${appt.service.name} has been cancelled as requested.`,
    "STATUS",
    appt.id,
  );
  return { ok: true as const, appointment: updated };
}
