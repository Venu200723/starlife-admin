"use client";

// /reset-password — landing page for the one-time password reset link from
// /api/auth/patient/forgot-password. Standalone from the patient SPA: the
// link may be opened on a fresh device/browser where no app state exists.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordInner() {
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(params.get("token"));
  }, [params]);

  const submit = async () => {
    setError(null);
    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/patient/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
      if (res.ok && body?.ok) {
        setDone(true);
      } else {
        setError(body?.error?.message ?? "Could not reset the password. Please request a new link.");
      }
    } catch {
      setError("You appear to be offline. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a new password for your STAR LIFE Clinic account. It needs at least 8 characters.
          </p>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-secondary/70 p-3 text-sm leading-relaxed text-secondary-foreground">
              Your password has been updated. You can now sign in with the new password.
            </p>
            <Button className="h-12 w-full rounded-xl font-bold" onClick={() => (window.location.href = "/")}>
              Go to the app and sign in
            </Button>
          </div>
        ) : !token ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-destructive/10 p-3 text-sm leading-relaxed text-destructive">
              This reset link is missing its token. Please request a new link from the app (Sign in → Forgot
              password?).
            </p>
            <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => (window.location.href = "/")}>
              Open the app
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rp-new">New password</Label>
              <Input
                id="rp-new"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-confirm">Repeat new password</Label>
              <Input
                id="rp-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat the new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
            {error && (
              <p className="rounded-xl bg-destructive/10 p-3 text-sm leading-relaxed text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button className="h-12 w-full rounded-xl font-bold" onClick={() => void submit()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Update password"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
