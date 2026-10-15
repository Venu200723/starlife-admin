"use client";

// Account sign-in: Google (via Supabase Auth) or email + password. Phone is
// collected on the booking form, never used to sign in.
import { useEffect, useRef, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { apiFetch, setStoredToken } from "@/lib/client/api";
import type { PatientInfo } from "@/types";
import type { OverlayEntry } from "@/types";

/** Official four-colour Google "G" mark. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function SignInScreen({ redirectTo }: { redirectTo?: OverlayEntry }) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const { toast } = useToast();
  const setPatient = useAppStore((s) => s.setPatient);
  const { pop, push } = useOverlayNav();
  const popupRef = useRef<Window | null>(null);

  const done = (patient: PatientInfo, token?: string) => {
    // Persist the session token — cookies can be blocked in webview/iframe
    // contexts, so the app also authenticates via Authorization header.
    if (token) setStoredToken("patient", token);
    setPatient(patient);
    toast({ title: "Signed in", description: `Welcome${patient.fullName ? `, ${patient.fullName}` : ""}!` });
    if (redirectTo) {
      pop();
      push(redirectTo);
    } else {
      pop();
    }
  };

  // The OAuth popup hands the session over with a postMessage; keep a live
  // ref of `done` so the listener always closes over fresh overlay state.
  const doneRef = useRef(done);
  useEffect(() => {
    doneRef.current = done;
  });

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as
        | { type?: string; ok?: boolean; token?: string; patient?: PatientInfo; reason?: string }
        | null;
      if (!data || data.type !== "slc:oauth") return;
      popupRef.current = null;
      if (data.ok && data.token && data.patient) {
        doneRef.current(data.patient, data.token);
      } else {
        const reason = data.reason === "cancelled" ? "Google sign-in was cancelled." : "Google sign-in failed. Please try again.";
        toast({ title: "Sign-in failed", description: reason, variant: "destructive" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const googleSignIn = () => {
    // Top-level popup: Google's consent screen refuses to render inside
    // iframes, and the popup keeps this screen (and its overlay stack) alive.
    const popup = window.open("/api/auth/patient/oauth/start", "slc-oauth", "popup=true,width=500,height=640");
    if (popup) {
      popupRef.current = popup;
      popup.focus();
    } else {
      // Popup blocked — full-page navigation. The complete page detects the
      // missing opener and continues straight into the app.
      window.location.href = "/api/auth/patient/oauth/start";
    }
  };

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "Check your email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    if (mode === "forgot") {
      setBusy(true);
      const res = await apiFetch<{ sent: boolean; demo?: boolean; resetUrl?: string }>(
        "/api/auth/patient/forgot-password",
        { method: "POST", json: { email: email.trim().toLowerCase() } },
      );
      setBusy(false);
      if (res.ok) {
        setResetLink(res.data?.resetUrl ?? null);
      } else {
        toast({ title: "Could not send reset link", description: res.error?.message, variant: "destructive" });
      }
      return;
    }
    if (mode === "signup" && fullName.trim().length < 2) {
      toast({ title: "Check your name", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (mode === "signup" && password.length < 8) {
      toast({ title: "Check your password", description: "Passwords need at least 8 characters.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const res =
      mode === "signup"
        ? await apiFetch<{ patient: PatientInfo; token: string }>("/api/auth/patient/register", {
            method: "POST",
            json: { fullName: fullName.trim(), email: email.trim().toLowerCase(), password },
          })
        : await apiFetch<{ patient: PatientInfo; token: string }>("/api/auth/patient/login", {
            method: "POST",
            json: { email: email.trim().toLowerCase(), password },
          });
    setBusy(false);
    if (res.ok && res.data) {
      done(res.data.patient, res.data.token);
    } else {
      toast({ title: mode === "signup" ? "Could not create account" : "Sign-in failed", description: res.error?.message, variant: "destructive" });
    }
  };

  if (mode === "forgot" && resetLink !== null) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-2 border-b bg-card/95 px-3 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMode("signin");
              setResetLink(null);
            }}
            aria-label="Go back"
            className="rounded-full"
          >
            ‹
          </Button>
          <h1 className="text-base font-semibold">Check your email</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email.trim().toLowerCase()}</span>,
              a password reset link is on its way. The link expires in 15 minutes.
            </p>
            {resetLink && (
              <div className="space-y-2 rounded-xl bg-secondary/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                  Demo mode — reset link
                </p>
                <p className="text-xs leading-relaxed text-secondary-foreground">
                  Email delivery is not configured on this deployment, so the reset link is shown here.
                </p>
                <Button className="h-10 w-full rounded-xl font-semibold" onClick={() => window.open(resetLink, "_self")}>
                  Open reset page
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl"
              onClick={() => {
                setMode("signin");
                setResetLink(null);
                setPassword("");
              }}
            >
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b bg-card/95 px-3 py-3">
        <Button variant="ghost" size="icon" onClick={pop} aria-label="Go back" className="rounded-full">
          ‹
        </Button>
        <h1 className="text-base font-semibold">
          {mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in"}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {mode === "signup"
              ? "Create your STAR LIFE Clinic account with your email and a password."
              : mode === "forgot"
                ? "Enter the email you signed up with and we will send you a password reset link."
                : "Welcome back. Sign in to manage your appointments and updates."}
          </p>

          {mode === "signin" && (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-xl font-semibold"
              onClick={googleSignIn}
            >
              <span className="inline-flex items-center gap-2.5">
                <GoogleMark />
                Continue with Google
              </span>
            </Button>
          )}

          {mode === "signin" && (
            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">or with email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="si-name">Full name</Label>
              <Input
                id="si-name"
                placeholder="Your full name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="si-email">Email</Label>
            <Input
              id="si-email"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="si-password">Password</Label>
              <Input
                id="si-password"
                type="password"
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
          )}

          <Button className="h-12 w-full rounded-xl font-bold" onClick={() => void submit()} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" aria-hidden />
                {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </span>
            )}
          </Button>

          {mode === "signin" && (
            <p className="text-center text-sm">
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setMode("forgot");
                  setPassword("");
                }}
              >
                Forgot password?
              </button>
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to the clinic?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setPassword("");
              }}
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>

          <p className="rounded-xl bg-secondary/70 p-3 text-xs leading-relaxed text-secondary-foreground">
            Your mobile number is asked only on the booking form so the clinic can reach you about the visit —
            it is never used to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
