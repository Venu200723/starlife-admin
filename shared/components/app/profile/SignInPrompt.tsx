"use client";

// Reusable sign-in prompt card (used when a signed-in feature is gated).
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { LogIn } from "lucide-react";

export function SignInPrompt({ title, body }: { title: string; body: string }) {
  const { push } = useOverlayNav();
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-border/60">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
        <LogIn className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Button className="mt-4 h-11 w-full rounded-xl font-semibold" onClick={() => push({ name: "signin" })}>
        Sign in
      </Button>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Sign in with your email and password.
      </p>
    </div>
  );
}

/** Convenience hook for other screens. */
export function useRequireSignIn() {
  const patient = useAppStore((s) => s.patient);
  const { push } = useOverlayNav();
  return {
    patient,
    requireSignIn: (redirectTo?: { name: Parameters<typeof push>[0]["name"] }) => {
      if (!patient) {
        push({ name: "signin", redirectTo });
        return false;
      }
      return true;
    },
  };
}
