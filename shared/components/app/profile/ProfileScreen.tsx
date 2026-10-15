"use client";

// Profile tab — identity, quick links, settings.
// NOTE: no staff/admin entry here by design — patients must never see a path
// to the admin dashboard. Staff use the hidden #admin URL hash or the secret
// 5-tap gesture on the version footer below.
import {
  CalendarDays,
  Bell,
  ShieldCheck,
  FileText,
  Pencil,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { SignInPrompt } from "./SignInPrompt";
import { AvatarInitials } from "../shared";
import { apiFetch, clearStoredToken } from "@/lib/client/api";

export function ProfileScreen() {
  const patient = useAppStore((s) => s.patient);
  const loading = useAppStore((s) => s.patientLoading);
  const setPatient = useAppStore((s) => s.setPatient);
  const setTab = useAppStore((s) => s.setTab);
  const { push } = useOverlayNav();
  const { toast } = useToast();

  const signOut = async () => {
    await apiFetch("/api/auth/patient/logout", { method: "POST" });
    clearStoredToken("patient");
    setPatient(null);
    toast({ title: "Signed out", description: "You have been signed out." });
  };

  return (
    <div className="pb-6">
      <header className="px-4 pb-2 pt-5">
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
      </header>

      {loading ? (
        <div className="px-4">
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : !patient ? (
        <div className="px-4">
          <SignInPrompt
            title="You're not signed in"
            body="Sign in with your email and password to manage appointments and receive updates."
          />
        </div>
      ) : (
        <>
          <section className="mx-4 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
            <AvatarInitials name={patient.fullName ?? patient.email ?? "P"} className="h-14 w-14 text-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{patient.fullName ?? "Patient"}</p>
              <p className="truncate text-sm text-muted-foreground">{patient.email}</p>
              {patient.phone ? (
                <p className="text-xs text-muted-foreground">+91 {patient.phone}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Phone is added when you book</p>
              )}
              {patient.age != null && patient.gender && (
                <p className="text-xs text-muted-foreground">
                  {patient.age} yrs · {patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase()}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg font-semibold"
              onClick={() => push({ name: "edit-profile" })}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </Button>
          </section>

          <section className="mx-4 mt-4 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60">
            <MenuRow
              icon={<CalendarDays className="h-4.5 w-4.5" aria-hidden />}
              label="My Appointments"
              onClick={() => setTab("appointments")}
            />
            <Separator />
            <MenuRow
              icon={
                <span className="relative">
                  <Bell className="h-4.5 w-4.5" aria-hidden />
                  {(patient.unreadNotifications ?? 0) > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                      {patient.unreadNotifications}
                    </span>
                  )}
                </span>
              }
              label="Notifications"
              onClick={() => push({ name: "notifications" })}
            />
            <Separator />
            <MenuRow
              icon={<ShieldCheck className="h-4.5 w-4.5" aria-hidden />}
              label="Privacy Policy"
              onClick={() => push({ name: "privacy" })}
            />
            <Separator />
            <MenuRow
              icon={<FileText className="h-4.5 w-4.5" aria-hidden />}
              label="Terms of Use"
              onClick={() => push({ name: "terms" })}
            />
          </section>

          <section className="mx-4 mt-4 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-destructive transition hover:bg-error-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                  <LogOut className="h-4.5 w-4.5" aria-hidden />
                  Sign out
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You can sign back in anytime with your email and password. Your appointments stay on record.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Stay signed in</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void signOut()}>Sign out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>

          <VersionFooter />
        </>
      )}
    </div>
  );
}

function VersionFooter() {
  return (
    <p className="mt-6 text-center text-[11px] text-muted-foreground">
      STAR LIFE Clinic · Patient app v1.0
    </p>
  );
}

function MenuRow({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
      </span>
    </button>
  );
}
