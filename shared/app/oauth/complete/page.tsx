"use client";

// /oauth/complete — landing page for the Google sign-in popup/redirect.
//
// /api/auth/patient/oauth/callback redirects here with the app session token
// in the URL fragment (fragments are never sent to any server). This page:
//   - with an opener (popup flow): fetches the patient profile with the fresh
//     session cookie, postMessages { token, patient } to the sign-in screen,
//     then closes itself;
//   - standalone (popup was blocked, full-page navigation): stores the token
//     locally and continues into the app at /;
//   - with ?error=…: shows a friendly explanation of what went wrong.
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, setStoredToken } from "@/lib/client/api";
import type { PatientInfo } from "@/types";

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  not_configured: {
    title: "Google sign-in isn't set up yet",
    body: "This deployment is missing the Supabase Google provider configuration. The clinic's email + password sign-in works as usual.",
  },
  cancelled: {
    title: "Sign-in cancelled",
    body: "You closed the Google consent screen. Nothing happened — you can try again any time.",
  },
  expired: {
    title: "Sign-in session expired",
    body: "The sign-in attempt took too long or lost its secure cookie. Please go back to the app and try again.",
  },
  missing_code: {
    title: "Sign-in could not be completed",
    body: "The Google response was missing its authorization code. Please go back and try again.",
  },
  ratelimited: {
    title: "Too many attempts",
    body: "There were too many sign-in attempts from this device. Please wait a few minutes and try again.",
  },
  google: {
    title: "Google sign-in failed",
    body: "Google or Supabase rejected the sign-in. Please check that the Google provider is enabled on the Supabase project, then try again.",
  },
  server: {
    title: "Something went wrong",
    body: "An unexpected error occurred while completing the sign-in. Please try again.",
  },
};

function CompleteInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const [failed, setFailed] = useState<string | null>(error);
  const [closed, setClosed] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (error) {
      // Notify the opener (sign-in screen) so its popup handling can wind down.
      try {
        window.opener?.postMessage(
          { type: "slc:oauth", ok: false, reason: error },
          window.location.origin,
        );
      } catch {
        // opener gone / cross-origin — the page copy covers it
      }
      return;
    }

    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const token = hash.get("token");
      if (!token) {
        setFailed("missing_code");
        return;
      }
      // The session cookie was set server-side — fetch the profile with it.
      const me = await apiFetch<PatientInfo>("/api/auth/patient/me");
      if (!me.ok || !me.data) {
        setFailed("server");
        return;
      }
      try {
        window.opener?.postMessage(
          { type: "slc:oauth", ok: true, token, patient: me.data },
          window.location.origin,
        );
      } catch {
        // opener gone — fall through to the standalone path
      }
      setStoredToken("patient", token);
      if (window.opener) {
        setClosed(true);
        window.setTimeout(() => window.close(), 700);
      } else {
        // Standalone navigation (popup blocked): continue straight into the app.
        window.location.replace("/");
      }
    };
    void run();
  }, [error]);

  const copy = failed ? (ERROR_COPY[failed] ?? ERROR_COPY.server) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        {copy ? (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">{copy.title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
            </div>
            <Button className="h-12 w-full rounded-xl font-bold" onClick={() => (window.location.href = "/")}>
              Back to the app
            </Button>
          </>
        ) : closed ? (
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Signed in — you can close this window.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Completing Google sign-in…</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function OAuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <CompleteInner />
    </Suspense>
  );
}
