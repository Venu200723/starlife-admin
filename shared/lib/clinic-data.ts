// Loads the public clinic aggregate consumed by the patient app.
import { db } from "./db";
import { getSettings, DEFAULT_SETTINGS } from "./settings";
import { computeClinicStatus, type DayHours } from "./clinic-status";
import { getZonedNow, addDays } from "./time";

export interface PublicClinicData {
  clinic: {
    id: string;
    name: string;
    description: string | null;
    phone: string;
    address: string;
    mapsUrl: string | null;
    timezone: string;
    rating: number;
    reviewCount: number;
  };
  doctor: {
    id: string;
    name: string;
    photoUrl: string | null;
    bio: string | null;
    qualifications: string | null;
    specializations: string | null;
    experience: string | null;
  } | null;
  /** All bookable (active) doctors — the booking flow lets patients pick one. */
  doctors: {
    id: string;
    name: string;
    qualifications: string | null;
    specializations: string | null;
    experience: string | null;
  }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: number | null;
    isDemo: boolean;
  }[];
  hours: DayHours[];
  status: ReturnType<typeof computeClinicStatus>;
  settings: {
    bookingEnabled: boolean;
    autoConfirm: boolean;
    whatsappEnabled: boolean;
    whatsappNumber: string | null;
    maxAdvanceDays: number;
    cancellationCutoffHours: number;
    slotStepMinutes: number;
  };
}

export async function getPublicClinicData(): Promise<PublicClinicData> {
  const [clinic, doctorRows, services, hoursRows, settings] = await Promise.all([
    db.clinic.findFirst(),
    // All active doctors (primary = first). The staff site can add more;
    // inactive doctors disappear from the patient app but keep their history.
    db.doctor.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    db.service.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.clinicHour.findMany({ orderBy: { dayOfWeek: "asc" } }),
    getSettings().catch(() => DEFAULT_SETTINGS),
  ]);
  const doctor = doctorRows[0] ?? null;

  const hours: DayHours[] = hoursRows.map((h) => ({
    dayOfWeek: h.dayOfWeek,
    openingTime: h.openingTime,
    closingTime: h.closingTime,
    isOpen: h.isOpen,
  }));

  const now = getZonedNow(clinic?.timezone ?? "Asia/Kolkata");
  const status = computeClinicStatus(hours, now, addDays);

  return {
    clinic: {
      id: clinic?.id ?? "",
      name: clinic?.name ?? "STAR LIFE CLINIC",
      description: clinic?.description ?? null,
      phone: clinic?.phone ?? "",
      address: clinic?.address ?? "",
      mapsUrl: clinic?.mapsUrl ?? null,
      timezone: clinic?.timezone ?? "Asia/Kolkata",
      rating: clinic?.rating ?? 5.0,
      reviewCount: clinic?.reviewCount ?? 39,
    },
    doctor: doctor
      ? {
          id: doctor.id,
          name: doctor.name,
          photoUrl: doctor.photoUrl,
          bio: doctor.bio,
          qualifications: doctor.qualifications,
          specializations: doctor.specializations,
          experience: doctor.experience,
        }
      : null,
    // Bookable doctors for the patient booking flow (multi-doctor support).
    doctors: doctorRows.map((d) => ({
      id: d.id,
      name: d.name,
      qualifications: d.qualifications,
      specializations: d.specializations,
      experience: d.experience,
    })),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      price: s.price,
      isDemo: s.isDemo,
    })),
    hours,
    status,
    settings: {
      bookingEnabled: settings.bookingEnabled,
      autoConfirm: settings.autoConfirm,
      whatsappEnabled: settings.whatsappEnabled,
      whatsappNumber: settings.whatsappEnabled ? settings.whatsappNumber : null,
      maxAdvanceDays: settings.maxAdvanceDays,
      cancellationCutoffHours: settings.cancellationCutoffHours,
      slotStepMinutes: settings.slotStepMinutes,
    },
  };
}
