"use client";

// Appointment details overlay — status, info, actions (calendar, directions, call, cancel).
import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Navigation, Loader2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { ScreenHeader, StatusBadge, statusHelperText } from "../shared";
import { CallClinicButton } from "../CallClinicButton";
import { apiFetch, openDirections } from "@/lib/client/api";
import { formatDateLong, formatTime12h } from "@/lib/time";
import type { AppointmentDetail } from "@/types";

export function AppointmentDetailsScreen({ id }: { id: string }) {
  const [data, setData] = useState<AppointmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const clinic = useAppStore((s) => s.clinic);

  const load = useCallback(async () => {
    const res = await apiFetch<AppointmentDetail>(`/api/appointments/${id}`);
    if (res.ok && res.data) setData(res.data);
    else setError(res.error?.message ?? "Could not load this appointment.");
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const cancel = async () => {
    setBusy(true);
    const res = await apiFetch(`/api/appointments/${id}/cancel`, { method: "POST" });
    setBusy(false);
    setConfirmingCancel(false);
    if (res.ok) {
      toast({ title: "Appointment cancelled", description: "The clinic has been informed." });
      void load();
    } else {
      toast({ title: "Could not cancel", description: res.error?.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Appointment Details" />
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        {!data && !error && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-border/60">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
        {data && (
          <>
            <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{data.service.name}</p>
                  <p className="text-xs text-muted-foreground">{data.doctor.name} · {data.clinic.name}</p>
                </div>
                <StatusBadge status={data.status} />
              </div>
              <p className="mt-2.5 rounded-xl bg-muted/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {statusHelperText(data.status)}
              </p>
              <Separator className="my-3" />
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-semibold">{formatDateLong(data.appointmentDate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Time</dt>
                  <dd className="font-semibold">
                    {formatTime12h(data.startTime)} – {formatTime12h(data.endTime)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Appointment ID</dt>
                  <dd className="font-mono text-[13px] font-semibold">{data.code}</dd>
                </div>
                {data.patientNotes && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Your notes</dt>
                    <dd className="max-w-[60%] text-right font-medium">{data.patientNotes}</dd>
                  </div>
                )}
                {data.adminNotes && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Clinic note</dt>
                    <dd className="max-w-[60%] text-right font-medium">{data.adminNotes}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="mt-4 space-y-2.5">
              <a
                href={`/api/appointments/${data.id}/ics`}
                download={`${data.code}.ics`}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-input bg-card text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Add to calendar
              </a>
              <Button
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl font-semibold"
                onClick={() => openDirections(data.clinic.mapsUrl ?? clinic?.clinic.mapsUrl, data.clinic.address)}
              >
                <Navigation className="h-4 w-4" aria-hidden /> Get directions
              </Button>
              <CallClinicButton
                phone={data.clinic.phone}
                label={`Call ${data.clinic.phone}`}
                variant="outline"
                className="h-11 w-full rounded-xl font-semibold"
              />
              {data.canCancel && (
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl font-semibold text-destructive hover:bg-error-soft hover:text-destructive"
                  onClick={() => setConfirmingCancel(true)}
                >
                  Cancel appointment
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {data && (
                <>
                  {data.service.name} on {formatDateLong(data.appointmentDate)} at {formatTime12h(data.startTime)} will
                  be cancelled. The clinic will be notified.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void cancel();
              }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> Cancelling…
                </>
              ) : (
                "Yes, cancel it"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
