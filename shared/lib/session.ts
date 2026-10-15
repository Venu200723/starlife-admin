// Stateless HMAC-signed session tokens stored in httpOnly cookies.
// Patient sessions and admin sessions are separate tokens/cookies.
//
// Dual-mode sessions: every authenticated route accepts the session token via
// EITHER the httpOnly cookie OR an `Authorization: Bearer <token>` header.
// The header path keeps sign-in working in contexts where browsers block
// cookies (in-app webviews / preview iframes = third-party context); the
// cookie path remains the primary mechanism for normal browsing + PWA use.
import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";

const SECRET =
  process.env.AUTH_SECRET || "starlife-dev-secret-change-in-production-9f2c1b";

export const PATIENT_COOKIE = "slc_patient";
export const ADMIN_COOKIE = "slc_admin";

export interface PatientSession {
  patientId: string;
  email: string | null;
  iat: number;
}
export interface AdminSession {
  adminId: string;
  username: string;
  role: string;
  iat: number;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createToken(data: Record<string, unknown>): string {
  const body = b64url(JSON.stringify({ ...data, iat: Date.now() }));
  return `${body}.${sign(body)}`;
}

/** Extract a Bearer token from the Authorization header, if present. */
export function bearerToken(h: Headers): string | null {
  const auth = h.get("authorization");
  if (!auth) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(auth.trim());
  return m ? m[1] : null;
}

/** Resolve a session token: Authorization header first, then cookie. */
async function resolveToken(kind: "patient" | "admin"): Promise<string | null> {
  const [hdrs, store] = await Promise.all([headers(), cookies()]);
  const bearer = bearerToken(hdrs);
  if (bearer) {
    // Only honor a bearer token that verifies AND belongs to this session kind
    // (the `aud` claim stops admin tokens opening patient routes, etc.).
    const verified =
      kind === "patient"
        ? verifyToken<PatientSession & { aud?: string }>(bearer)
        : verifyToken<AdminSession & { aud?: string }>(bearer);
    if (verified && verified.aud === kind) return bearer;
  }
  return store.get(kind === "patient" ? PATIENT_COOKIE : ADMIN_COOKIE)?.value ?? null;
}

export function verifyToken<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Build the patient session JWT (used by cookie and Bearer modes alike). */
export function createPatientToken(patientId: string, email: string | null): string {
  return createToken({ aud: "patient", patientId, email });
}

/** Cookie descriptor for NextResponse.cookies.set() / cookie-store.set(). */
export function patientSessionCookie(token: string) {
  return {
    name: PATIENT_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}

export async function setPatientCookie(patientId: string, email: string | null): Promise<string> {
  const token = createPatientToken(patientId, email);
  const store = await cookies();
  store.set(patientSessionCookie(token));
  return token;
}

export async function clearPatientCookie() {
  const store = await cookies();
  store.set(PATIENT_COOKIE, "", { ...baseCookie, maxAge: 0 });
}

export async function getPatientSession(): Promise<PatientSession | null> {
  const token = await resolveToken("patient");
  return verifyToken<PatientSession>(token);
}

export async function setAdminCookie(adminId: string, username: string, role: string): Promise<string> {
  const token = createToken({ aud: "admin", adminId, username, role });
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    ...baseCookie,
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return token;
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", { ...baseCookie, maxAge: 0 });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = await resolveToken("admin");
  return verifyToken<AdminSession>(token);
}
