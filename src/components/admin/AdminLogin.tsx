"use client";

// Admin login — credentials live in the admins table (seeded from env).
import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, setStoredToken } from "@/lib/client/api";

export function AdminLogin({
  onSuccess,
}: {
  onSuccess: (session: { username: string; role: string }) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await apiFetch<{ username: string; role: string; token?: string }>("/api/admin/login", {
      method: "POST",
      json: { username, password },
    });
    setBusy(false);
    if (res.ok && res.data) {
      // Persist the admin session token — cookies can be blocked in
      // webview/iframe contexts, so the header path keeps the session alive.
      if (res.data.token) setStoredToken("admin", res.data.token);
      toast({ title: "Welcome back", description: `Signed in as ${res.data.username}` });
      onSuccess(res.data);
    } else {
      toast({ title: "Sign-in failed", description: res.error?.message ?? "Check your credentials.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0b1d21] p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-card p-6 shadow-xl">
          <div className="flex flex-col items-center text-center">
            <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white">
              <LockKeyhole className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="mt-4 text-lg font-bold">STAR LIFE CLINIC</h1>
            <p className="text-sm text-muted-foreground">Staff & Admin Dashboard</p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ad-user">Username</Label>
              <Input
                id="ad-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-pass">Password</Label>
              <Input
                id="ad-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl font-bold" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            Staff access only. Credentials are confidential and are never
            displayed in the app — the clinic owner manages them via the
            server&apos;s ADMIN_USERNAME / ADMIN_PASSWORD settings.
          </p>
        </div>

      </div>
    </div>
  );
}
