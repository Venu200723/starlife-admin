// GET /api/auth/patient/oauth/start — begin Google sign-in via Supabase Auth.
//
// Server-side PKCE flow: this route generates a code verifier (kept in a
// short-lived httpOnly cookie on the app's own origin — it doubles as the
// CSRF binding) and redirects the browser to Supabase's /authorize endpoint,
// which forwards to Google for consent. Supabase sends the user back to
// /api/auth/patient/oauth/callback with an authorization code that only this
// server (holding the verifier) can exchange.
//
// One-time dashboard setup for this to work end-to-end:
//  1. Google Cloud console → the OAuth client:
//     - Authorized redirect URI: https://<project-ref>.supabase.co/auth/v1/callback
//  2. Supabase dashboard → Authentication → Providers → Google:
//     enable + paste the Google client ID and secret.
//  3. Supabase dashboard → Authentication → URL Configuration → Redirect URLs:
//     add <app-origin>/api/auth/patient/oauth/callback (e.g. http://localhost:3000/...).
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseReady } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const VERIFIER_COOKIE = "slc_oauth_verifier";

const verifierCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 600, // 10 minutes — the consent round-trip needs no more
};

export async function GET(req: Request) {
  const rl = rateLimit(`poauthstart:${clientIp(req)}`, 20, 10 * 60_000);
  const origin = publicOrigin(req);
  if (!rl.ok) {
    return NextResponse.redirect(`${origin}/oauth/complete?error=ratelimited`);
  }
  if (!supabaseReady() || !process.env.SUPABASE_URL) {
    // Google sign-in is not wired up on this deployment.
    return NextResponse.redirect(`${origin}/oauth/complete?error=not_configured`);
  }

  // PKCE pair: the verifier stays server-side (cookie), only the derived
  // challenge travels to Supabase/Google.
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const authorizeUrl = new URL("/auth/v1/authorize", process.env.SUPABASE_URL);
  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", `${origin}/api/auth/patient/oauth/callback`);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "s256");

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set({ name: VERIFIER_COOKIE, value: verifier, ...verifierCookieOptions });
  // Diagnostic: Supabase rejects redirect_to values that are not in its
  // "Redirect URLs" allowlist by silently bouncing the final ?code= to the
  // project Site URL instead. Logging the exact origin used makes that
  // misconfiguration obvious from the dev log.
  console.log(`[oauth] start: origin=${origin} redirect_to=${authorizeUrl.searchParams.get("redirect_to")}`);
  return res;
}
