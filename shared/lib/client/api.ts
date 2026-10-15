"use client";

// Client-side API helpers + analytics + deep links.
export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// ---------------------------------------------------------------------------
// Dual-mode session support.
// Browsers block cookies in third-party contexts (in-app webviews / preview
// iframes), which previously signed users out instantly after login/OAuth.
// Sessions therefore also travel as `Authorization: Bearer <token>` headers:
// the server returns the token on login/verify, we persist it here, and
// apiFetch attaches it automatically per API area (admin vs patient).
// ---------------------------------------------------------------------------
export type SessionKind = "patient" | "admin";

const TOKEN_KEYS: Record<SessionKind, string> = {
  patient: "slc_token_patient",
  admin: "slc_token_admin",
};

export function getStoredToken(kind: SessionKind): string | null {
  try {
    return localStorage.getItem(TOKEN_KEYS[kind]);
  } catch {
    return null;
  }
}

export function setStoredToken(kind: SessionKind, token: string) {
  try {
    localStorage.setItem(TOKEN_KEYS[kind], token);
  } catch {
    // Storage unavailable (rare) — cookie mode still applies where possible.
  }
}

export function clearStoredToken(kind: SessionKind) {
  try {
    localStorage.removeItem(TOKEN_KEYS[kind]);
  } catch {
    // ignore
  }
}

export async function apiFetch<T>(
  input: string,
  init?: RequestInit & { json?: unknown },
): Promise<ApiEnvelope<T>> {
  try {
    const { json, ...rest } = init ?? {};
    // Pick the session token that matches the API area being called.
    const kind: SessionKind = input.startsWith("/api/admin") ? "admin" : "patient";
    const token = getStoredToken(kind);
    // The staff site builds under basePath /staff (single-port preview
    // hosting); NEXT_PUBLIC_STAFF_BASE is inlined into its bundle only, so
    // patient-side fetches are untouched.
    const staffBase = process.env.NEXT_PUBLIC_STAFF_BASE ?? "";
    const url = `${staffBase}${input}`;
    const res = await fetch(url, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.headers ?? {}),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
    });
    // 401 means the stored token is no longer valid — drop it so the UI can
    // fall back to a clean sign-in state instead of looping on a dead token.
    if (res.status === 401 && token) clearStoredToken(kind);
    const payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (!payload) {
      return { ok: false, error: { code: "SERVER_ERROR", message: "The clinic server is unreachable. Please try again." } };
    }
    return payload;
  } catch {
    return {
      ok: false,
      error: {
        code: "NETWORK",
        message: "You appear to be offline. Please check your internet connection and try again.",
      },
    };
  }
}

/** Privacy-conscious, fire-and-forget analytics. */
export function track(type: string) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  }).catch(() => undefined);
}

/** Open the clinic's Google Maps listing with graceful fallback. */
export function openDirections(mapsUrl: string | null | undefined, address: string) {
  track("DIRECTIONS_CLICKED");
  const url = mapsUrl?.trim();
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  // Fallback: query-based maps URL
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

/** Open the device dialer (the OS dialog lets the user confirm the call). */
export function openDialer(phone: string) {
  track("CALL_CLICKED");
  window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
}
