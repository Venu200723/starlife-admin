// Shared client-facing types (mirror the API payloads).
import type { PublicClinicData } from "@/lib/clinic-data";

export type ClinicData = PublicClinicData;

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "NO_SHOW";

export interface PatientInfo {
  id: string;
  phone: string | null; // optional — captured when booking, not a login method
  fullName: string | null;
  email: string | null;
  age: number | null;
  gender: string | null;
  unreadNotifications?: number;
}

export interface AppointmentListItem {
  id: string;
  code: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  patientNotes?: string | null;
  canCancel: boolean;
  service: { name: string; durationMinutes: number };
  doctor: { name: string };
}

export interface AppointmentDetail extends AppointmentListItem {
  adminNotes: string | null;
  clinic: { name: string; phone: string; address: string; mapsUrl: string | null };
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface BookingConfirmation {
  id: string;
  code: string;
  status: string;
  serviceName: string;
  doctorName: string;
  date: string;
  time: string;
  patientName: string;
  phone: string;
}

export interface DayBlocksDetail {
  blockedDate: { id: string; reason: string | null } | null;
  blockedSlots: { id: string; startTime: string; endTime: string; reason: string | null }[];
  appointments: {
    id: string;
    code: string;
    startTime: string;
    endTime: string;
    status: AppointmentStatus;
    patientName: string;
    patientPhone: string;
    serviceName: string;
  }[];
}

export type TabKey = "home" | "appointments" | "clinic" | "profile";

export type OverlayName =
  | "doctor"
  | "services"
  | "hours"
  | "location"
  | "booking"
  | "confirmation"
  | "appointment-details"
  | "notifications"
  | "privacy"
  | "terms"
  | "edit-profile"
  | "signin";

export interface OverlayEntry {
  name: OverlayName;
  id?: string; // appointment id for details
  confirmation?: BookingConfirmation;
  redirectTo?: { name: OverlayName };
}
