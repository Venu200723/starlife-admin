"use client";

// My Appointments — Upcoming / Past tabs with cancel actions.
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { apiFetch, track } from "@/lib/client/api";
import { StatusBadge, statusHelperText } from "../shared";
import { SignInPrompt } from "../profile/SignInPrompt";
import { dateParts, formatDateMedium, formatTime12h } from "@/lib/time";
import type { AppointmentListItem } from "@/types";

export function AppointmentsScreen() {
  const patient = useAppStore((s) => s.patient);
  const clinic = useAppStore((s) => s.clinic);
  const { push } = useOverlayNav();

  if (!patient) {
    return (
      <div className="p-4">
        <header className="pb-4 pt-5">
          <h1 className="text-xl font-bold tracking-tight">My Appointments</h1>
        </header>
        <SignInPrompt
          title="Sign in to see your appointments"
          body="Sign in with your email and password to view upcoming visits, history and status updates."
        />
      </div>
    );
  }
  if (!clinic) return null;

  return (
    <div className="pb-6">
      <header className="flex items-center justify-between px-4 pb-2 pt-5">
        <h1 className="text-xl font-bold tracking-tight">My Appointments</h1>
      </header>

      <Tabs defaultValue="upcoming" className="px-4">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="upcoming" className="rounded-lg font-semibold">Upcoming</TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg font-semibold">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-3">
          <AppointmentList scope="upcoming" />
        </TabsContent>
        <TabsContent value="past" className="mt-3">
          <AppointmentList scope="past" />
        </TabsContent>
      </Tabs>

      <div className="px-4 pt-4">
        <Button
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl font-semibold"
          onClick={() => {
            track("BOOKING_STARTED");
            push({ name: "booking" });
          }}
        >
          <Plus className="h-4 w-4" aria-hidden /> Book new appointment
        </Button>
      </div>
    </div>
  );
}

function AppointmentList({ scope }: { scope: "upcoming" | "past" }) {
  const [items, setItems] = useState<AppointmentListItem[] | null>(null);
  const [cancelling, setCancelling] = useState<AppointmentListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { push } = useOverlayNav();
  const setPatient = useAppStore((s) => s.setPatient);
  const patient = useAppStore((s) => s.patient);

  const load = useCallback(async () => {
    const res = await apiFetch<{ items: AppointmentListItem[] }>(`/api/appointments?scope=${scope}`);
    if (res.ok && res.data) setItems(res.data.items);
    else setItems([]);
  }, [scope]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    const res = await apiFetch(`/api/appointments/${cancelling.id}/cancel`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      track("APPOINTMENT_CANCELLED");
      toast({ title: "Appointment cancelled", description: "The clinic has been informed." });
      setCancelling(null);
      void load();
      // refresh unread badge
      const me = await apiFetch<NonNullable<typeof patient>>("/api/auth/patient/me");
      if (me.ok && me.data) setPatient(me.data);
    } else {
      toast({ title: "Could not cancel", description: res.error?.message, variant: "destructive" });
      setCancelling(null);
      void load();
    }
  };

  if (items === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-sm ring-1 ring-border/60">
        <CalendarDays className="h-8 w-8 text-muted-foreground/60" aria-hidden />
        <p className="mt-3 font-semibold">
          {scope === "upcoming" ? "No upcoming appointments" : "No past appointments"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {scope === "upcoming"
            ? "When you book an appointment it will appear here."
            : "Completed and cancelled appointments will be listed here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => {
        const parts = dateParts(a.appointmentDate);
        return (
          <div key={a.id} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
            <div className="flex gap-3">
              <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-secondary py-2 text-secondary-foreground">
                <span className="text-xl font-bold leading-none tabular">{parts.day}</span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase">{parts.monthShort}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.service.name}</p>
                    <p className="text-xs text-muted-foreground">{a.doctor.name}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-1 text-sm font-medium tabular">
                  {formatDateMedium(a.appointmentDate)} · {formatTime12h(a.startTime)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {statusHelperText(a.status)}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 rounded-lg px-3 font-semibold text-secondary-foreground"
                    onClick={() => push({ name: "appointment-details", id: a.id })}
                  >
                    View details
                    <ChevronRight className="ml-0.5 h-3.5 w-3.5" aria-hidden />
                  </Button>
                  {a.canCancel && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-3 font-semibold text-destructive hover:bg-error-soft hover:text-destructive"
                      onClick={() => setCancelling(a)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <AlertDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling && (
                <>
                  {cancelling.service.name} on {formatDateMedium(cancelling.appointmentDate)} at{" "}
                  {formatTime12h(cancelling.startTime)} will be cancelled. The clinic will be notified.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmCancel();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? "Cancelling…" : "Yes, cancel it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Small refresh affordance used inside the header of the screen when signed in.
export function RefreshAppointmentsButton() {
  return (
    <Button variant="ghost" size="icon" aria-label="Refresh" className="rounded-full">
      <RefreshCw className="h-4 w-4" />
    </Button>
  );
}
