"use client";

// Post-booking confirmation card — never claims "confirmed" unless it is.
import { CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { CallClinicButton } from "../CallClinicButton";
import { openDirections } from "@/lib/client/api";
import { formatDateLong, formatTime12h } from "@/lib/time";
import type { BookingConfirmation } from "@/types";

export function ConfirmationScreen({ confirmation }: { confirmation: BookingConfirmation }) {
  const clinic = useAppStore((s) => s.clinic);
  const { resetStack } = useOverlayNav();
  if (!clinic) return null;

  const isConfirmed = confirmation.status === "CONFIRMED";

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        <div className="flex flex-col items-center pt-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="h-11 w-11 text-success" aria-hidden />
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight">
            {isConfirmed ? "Appointment Confirmed" : "Appointment Request Submitted"}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {isConfirmed
              ? "Your appointment is confirmed. Please arrive 10 minutes early."
              : "The clinic will confirm your request shortly. You'll receive a notification here."}
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
          <p className="text-center text-lg font-bold tracking-wide">{clinic.clinic.name}</p>
          <p className="text-center text-xs text-muted-foreground">{confirmation.doctorName}</p>
          <div className="my-3 border-t border-dashed" aria-hidden />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-semibold">{formatDateLong(confirmation.date)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-semibold">{formatTime12h(confirmation.time)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="font-semibold">{confirmation.serviceName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Patient</dt>
              <dd className="font-semibold">{confirmation.patientName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-semibold">+91 {confirmation.phone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Appointment ID</dt>
              <dd className="font-mono text-[13px] font-semibold">{confirmation.code}</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-muted/70 px-3 py-2 text-[11px] text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Keep the appointment ID handy when contacting the clinic.
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <a
            href={`/api/appointments/${confirmation.id}/ics`}
            download={`${confirmation.code}.ics`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-input bg-card text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            ADD TO CALENDAR
          </a>
          <Button
            variant="outline"
            className="h-12 w-full gap-2 rounded-xl font-semibold"
            onClick={() => openDirections(clinic.clinic.mapsUrl, clinic.clinic.address)}
          >
            GET DIRECTIONS
          </Button>
          <CallClinicButton
            phone={clinic.clinic.phone}
            label="CALL CLINIC"
            variant="outline"
            className="h-12 w-full rounded-xl font-semibold"
          />
          <Button className="h-12 w-full rounded-xl text-base font-bold" onClick={resetStack}>
            Done
          </Button>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          Sign in with your email to track this and future appointments. The clinic will call +91 {confirmation.phone} about this visit.
        </p>
      </div>
    </div>
  );
}
