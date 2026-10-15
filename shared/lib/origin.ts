// Resolve the public origin the patient's browser is actually using.
//
// Used to build absolute URLs that the patient's device must open (OAuth
// callback handed to Supabase, password-reset link). Prefers an explicit
// origin env (set APP_ORIGIN in production), then the browser-supplied
// Origin/Referer headers, then forwarded/host headers. Origin first because
// behind preview gateways/tunnels x-forwarded-host can name an internal
// upstream host that is not reachable from the patient's device.
export function publicOrigin(req: Request): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      if (/^https?:$/.test(u.protocol)) return `${u.protocol}//${u.host}`;
    } catch {
      // malformed referer — fall through
    }
  }
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
