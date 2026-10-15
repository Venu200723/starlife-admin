// Shared API helpers: consistent JSON responses and error envelopes.
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT_SLOT_TAKEN"
  | "CONFLICT_CODE"
  | "RATE_LIMITED"
  | "BOOKING_DISABLED"
  | "CANCEL_TOO_LATE"
  | "SERVER_ERROR";

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiOkNull(init?: ResponseInit) {
  return NextResponse.json({ ok: true, data: null }, init);
}

export function apiError(code: ApiErrorCode, message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: { code, message, ...extra } }, { status });
}

export function handleServerError(req: Request, err: unknown) {
  // Never log patient personal data — only the route and error type.
  console.error(`[api] ${new URL(req.url).pathname} failed:`, err instanceof Error ? err.message : err);
  return apiError("SERVER_ERROR", "Something went wrong on our side. Please try again.", 500);
}
