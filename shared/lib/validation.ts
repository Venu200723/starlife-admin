// Zod validation schemas shared by API routes and forms.
import { z } from "zod";

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

/** Normalize Indian mobile numbers: strip spaces/dashes, +91 / 91 / 0 prefixes. */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let d = digits;
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  else if (d.length === 13 && d.startsWith("091")) d = d.slice(3);
  if (d.length !== 10 || !/^[6-9]/.test(d)) return null;
  return d;
}

export const patientDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter the patient's full name")
    .max(80, "Name is too long"),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizeIndianPhone(v) !== null, "Enter a valid 10-digit Indian mobile number"),
  age: z.coerce
    .number({ message: "Age is required" })
    .int("Age must be a whole number")
    .min(1, "Age must be at least 1")
    .max(120, "Please enter a valid age"),
  gender: z.enum(GENDERS, { message: "Please select a gender" }),
  email: z
    .union([z.string().trim().email("Enter a valid email address"), z.literal("")])
    .optional(),
  notes: z.string().trim().max(500, "Notes are limited to 500 characters").optional(),
});
export type PatientDetails = z.infer<typeof patientDetailsSchema>;

// ---------------------------------------------------------------------------
// Patient account auth (email + password). Phone is NOT used to
// sign in — it is collected when booking a consultation.
// ---------------------------------------------------------------------------
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(120, "Email is too long");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const patientRegisterSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(80, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const patientLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "This reset link is not valid.").max(200),
  password: passwordSchema,
});

export const bookingSchema = z.object({
  serviceId: z.string().min(1, "Select a service"),
  // Optional doctor preference (multi-doctor clinics) — the server falls back
  // to the clinic's first active doctor when omitted.
  doctorId: z.string().trim().min(1).max(64).optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time"),
  patient: patientDetailsSchema,
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name is required").max(100),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().min(0).max(1000000).nullable().optional(),
  isActive: z.boolean().default(true),
});

// Doctor management (staff site). Only verified facts are ever entered here —
// fields left empty show "Information coming soon" in the patient app.
export const doctorSchema = z.object({
  name: z.string().trim().min(2, "Doctor name is required").max(120, "Name is too long"),
  qualifications: z.string().trim().max(200, "Qualifications are too long").optional().or(z.literal("")),
  specializations: z.string().trim().max(200, "Specializations are too long").optional().or(z.literal("")),
  experience: z.string().trim().max(100, "Experience is too long").optional().or(z.literal("")),
  bio: z.string().trim().max(1000, "Bio is too long").optional().or(z.literal("")),
  photoUrl: z.string().trim().max(500, "Photo URL is too long").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.union([z.string().trim().email("Enter a valid email address"), z.literal("")]).optional(),
  // Phone is optional profile data — settable only while it is still empty
  // (the number given when booking a consultation can backfill the profile).
  phone: z
    .union([
      z.string().trim().refine((v) => normalizeIndianPhone(v) !== null, "Enter a valid 10-digit Indian mobile number"),
      z.literal(""),
    ])
    .optional(),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.enum(GENDERS),
});

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const blockDateSchema = z.object({
  type: z.literal("date"),
  date: z.string().regex(DATE_RE, "Invalid date"),
  reason: z.string().trim().max(200).optional(),
});

export const blockSlotSchema = z.object({
  type: z.literal("slot"),
  date: z.string().regex(DATE_RE, "Invalid date"),
  startTime: z.string().regex(TIME_RE, "Invalid start time"),
  endTime: z.string().regex(TIME_RE, "Invalid end time"),
  reason: z.string().trim().max(200).optional(),
});

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
] as const;

export const statusChangeSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
  adminNotes: z.string().trim().max(500).optional(),
});
