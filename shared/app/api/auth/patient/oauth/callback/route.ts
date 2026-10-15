// GET /api/auth/patient/oauth/callback — Supabase sends the user here after
// Google consent. Exchanges the authorization code (PKCE) for the Supabase
// session, maps the Google identity onto the local patient profile with the
// same linking rules as password sign-in (authUid → email → create), then
// issues the app's own session (cookie + token) and forwards to
// /oauth/complete, which hands the session to the sign-in screen.
//
// All failure paths redirect to /oauth/complete?error=<reason> — the page
// there shows a friendly message and notifies the opener window.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicOrigin } from "@/lib/origin";
import { createPatientToken, patientSessionCookie } from "@/lib/session";
import { publishableKey } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const VERIFIER_COOKIE = "slc_oauth_verifier";

/** Shape of the Supabase user object inside the PKCE token response. */
interface SuUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1));
      } catch {
        return part.slice(eq + 1);
      }
    }
  }
  return null;
}

export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const clearVerifier = {
    name: VERIFIER_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${origin}/oauth/complete?error=${reason}`);
    res.cookies.set(clearVerifier);
    return res;
  };

  try {
    const url = new URL(req.url);
    const providerError = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    const verifier = readCookie(req, VERIFIER_COOKIE);

    if (providerError) {
      // access_denied = the user backed out of the Google consent screen.
      return fail(providerError === "access_denied" ? "cancelled" : "google");
    }
    if (!code) return fail("missing_code");
    if (!verifier) return fail("expired"); // cookie gone → restart the flow

    // PKCE exchange at Supabase — only this server holds the verifier.
    const tokenRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
      method: "POST",
      headers: {
        apikey: publishableKey()!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      cache: "no-store",
    });
    if (!tokenRes.ok) return fail("google");
    const suSession = (await tokenRes.json().catch(() => null)) as { user?: SuUser } | null;
    const suUser = suSession?.user ?? null;

    if (!suUser || !suUser.id || !suUser.email) return fail("google");
    const email = suUser.email.toLowerCase();

    // Link the Google identity onto the local profile — same rules as the
    // password login route (authUid match → email match → create).
    let patient = await db.patient.findUnique({ where: { authUid: suUser.id } });
    if (!patient) {
      const byEmail = await db.patient.findUnique({ where: { email } });
      patient = byEmail
        ? await db.patient.update({ where: { id: byEmail.id }, data: { authUid: suUser.id } })
        : await db.patient.create({
            data: {
              authUid: suUser.id,
              email,
              fullName:
                (suUser.user_metadata?.full_name as string | undefined) ??
                (suUser.user_metadata?.name as string | undefined) ??
                null,
            },
          });
    }

    // Issue the app session: cookie for normal browsing + token handed to the
    // complete page (URL fragment — never sent to a server) for contexts where
    // cookies are blocked (preview iframes / in-app webviews).
    const token = createPatientToken(patient.id, patient.email);
    const res = NextResponse.redirect(`${origin}/oauth/complete#token=${encodeURIComponent(token)}`);
    res.cookies.set(patientSessionCookie(token));
    res.cookies.set(clearVerifier); // single-use
    return res;
  } catch (err) {
    console.error("[api] /api/auth/patient/oauth/callback failed:", err instanceof Error ? err.message : err);
    return fail("server");
  }
}
