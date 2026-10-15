"use client";

// Doctor profile — only admin-configurable facts; unknowns show
// "Information coming soon" (never invented).
import { GraduationCap, Stethoscope, Briefcase, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { CallClinicButton } from "../CallClinicButton";
import { AvatarInitials, ScreenHeader } from "../shared";
import { formatTime12h, DAY_NAMES } from "@/lib/time";
import { track } from "@/lib/client/api";

function ComingSoon() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      <Info className="h-3 w-3" aria-hidden />
      Information coming soon
    </span>
  );
}

export function DoctorScreen() {
  const clinic = useAppStore((s) => s.clinic);
  const { push } = useOverlayNav();
  if (!clinic?.doctor) return null;
  const d = clinic.doctor;
  const weekday = new Date().getDay();
  const today = clinic.hours.find((h) => h.dayOfWeek === weekday);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Doctor" />

      <div className="flex-1 overflow-y-auto thin-scrollbar pb-6">
        <div className="flex flex-col items-center px-4 pt-6">
          <AvatarInitials name={d.name} className="h-24 w-24 text-3xl shadow-lg shadow-teal-900/10" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{d.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Stethoscope className="h-4 w-4" aria-hidden />
            Consultant · {clinic.clinic.name}
          </p>
        </div>

        <div className="mt-6 space-y-3 px-4">
          <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
            <h3 className="text-sm font-semibold">About</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {d.bio ?? "The doctor's profile is being updated. Please check back soon."}
            </p>
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <GraduationCap className="h-4 w-4 text-primary" aria-hidden /> Qualifications
            </h3>
            <div className="mt-2">
              {d.qualifications ? (
                <p className="text-sm text-muted-foreground">{d.qualifications}</p>
              ) : (
                <ComingSoon />
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Stethoscope className="h-4 w-4 text-primary" aria-hidden /> Specializations
            </h3>
            <div className="mt-2">
              {d.specializations ? (
                <div className="flex flex-wrap gap-1.5">
                  {d.specializations.split(",").map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {s.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <ComingSoon />
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Briefcase className="h-4 w-4 text-primary" aria-hidden /> Experience
            </h3>
            <div className="mt-2">
              {d.experience ? <p className="text-sm text-muted-foreground">{d.experience}</p> : <ComingSoon />}
            </div>
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
            <h3 className="text-sm font-semibold">Consultation</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {DAY_NAMES[weekday]}:{" "}
              {today?.isOpen
                ? `${formatTime12h(today.openingTime)} – ${formatTime12h(today.closingTime)}`
                : "Not consulting today"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Walk-in and appointment patients are seen during clinic hours. Appointment patients are given priority.
            </p>
          </section>
        </div>

        <div className="mt-4 space-y-2.5 px-4">
          <Button
            className="h-12 w-full rounded-xl text-base font-bold"
            onClick={() => {
              track("BOOKING_STARTED");
              push({ name: "booking" });
            }}
          >
            Book an Appointment
          </Button>
          <CallClinicButton
            phone={clinic.clinic.phone}
            label={`Call ${clinic.clinic.phone}`}
            variant="outline"
            className="h-11 w-full rounded-xl font-semibold"
          />
        </div>
      </div>
    </div>
  );
}
