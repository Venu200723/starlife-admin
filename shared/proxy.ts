// Rescue for OAuth codes that land on the site root.
//
// Supabase Auth appends ?code=... to whatever URL it bounces the browser to
// after Google consent. When the app's exact callback URL is missing from
// Supabase's "Redirect URLs" allowlist, Supabase falls back to the project's
// Site URL — the app's home page — instead of /api/auth/patient/oauth/callback.
// Without this file the user sees the home page with a dead ?code= in the
// address bar. With it, the code is internally routed (rewrite, no extra
// browser round-trip) to the real callback route: the PKCE verifier cookie is
// on the same origin, so sign-in still completes. If the verifier is missing
// or expired, the callback route redirects to /oauth/complete?error=expired
// with a friendly message and the user just retries.
import { NextResponse, type NextRequest } from "next/server";

function proxy(req: NextRequest) {
  if (!req.nextUrl.searchParams.get("code")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/api/auth/patient/oauth/callback";
  return NextResponse.rewrite(url);
}

export { proxy };
export default proxy;

export const config = {
  matcher: ["/"], // home page only — booking paths never carry ?code=
};
