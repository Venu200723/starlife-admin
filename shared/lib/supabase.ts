/**
 * Supabase Auth integration (server-side only).
 *
 * When SUPABASE_URL + a publishable key + a secret key are set, patient
 * accounts (email + password) are stored and verified by Supabase Auth.
 * Otherwise the app falls back to the built-in scrypt credentials in the
 * local database — both paths issue the same aud-bound session cookie /
 * Bearer token, so the client and the rest of the app are identical.
 *
 * Accepts both Supabase key formats:
 *  - Legacy JWT keys:        SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 *  - New 2025 API keys:      SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY
 *    (sb_publishable_… / sb_secret_… — the format currently issued by the
 *     Supabase dashboard)
 *
 * SUPABASE_JWKS_URL (…/auth/v1/.well-known/jwks.json) is stored for future
 * direct-JWT verification; this app verifies sign-ins by calling
 * signInWithPassword server-side, so JWKS is not required at runtime.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function secretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/** Publishable (anon) key — also used by the OAuth token-exchange call. */
export function publishableKey(): string | undefined {
  return process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
}

export function supabaseReady(): boolean {
  return Boolean(process.env.SUPABASE_URL && publishableKey() && secretKey());
}

let adminSingleton: SupabaseClient | null = null;

/** Service-role client — used to provision accounts (bypasses email confirmation). */
export function supabaseAdmin(): SupabaseClient {
  if (!adminSingleton) {
    adminSingleton = createClient(process.env.SUPABASE_URL!, secretKey()!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminSingleton;
}

let anonSingleton: SupabaseClient | null = null;

/** Anonymous client — used server-side for signInWithPassword verification. */
export function supabaseAnon(): SupabaseClient {
  if (!anonSingleton) {
    anonSingleton = createClient(process.env.SUPABASE_URL!, publishableKey()!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return anonSingleton;
}
