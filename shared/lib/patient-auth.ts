// Shared helpers for patient account sessions (email + password).
import { setPatientCookie } from "@/lib/session";
import type { Patient } from "@prisma/client";

/** Public shape of a patient — what the client store receives. */
export function patientPayload(p: Patient) {
  return {
    id: p.id,
    phone: p.phone,
    fullName: p.fullName,
    email: p.email,
    age: p.age,
    gender: p.gender,
  };
}

/** Create the patient session (cookie + Bearer token) and the API payload. */
export async function issuePatientSession(p: Patient) {
  const token = await setPatientCookie(p.id, p.email);
  return { token, patient: patientPayload(p) };
}
