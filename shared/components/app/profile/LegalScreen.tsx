"use client";

// Privacy Policy & Terms of Use — concise, honest, matching actual behavior.
import { ShieldCheck, FileText, Phone, MapPin } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { ScreenHeader } from "../shared";

export function LegalScreen({ kind }: { kind: "privacy" | "terms" }) {
  const clinic = useAppStore((s) => s.clinic);
  const isPrivacy = kind === "privacy";

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={isPrivacy ? "Privacy Policy" : "Terms of Use"}
        subtitle="Last updated: September 2026"
      />
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/60">
          <div className="flex items-center gap-2.5">
            {isPrivacy ? (
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            ) : (
              <FileText className="h-5 w-5 text-primary" aria-hidden />
            )}
            <h2 className="font-bold">
              {isPrivacy ? "Your privacy matters" : "Using this app"}
            </h2>
          </div>

          {isPrivacy ? (
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <Section title="What we collect">
                Only what is needed to manage appointments: your name, email (used for sign-in), the mobile number you
                give on the booking form, age, gender and
                any optional visit note you choose to add. Nothing else is required to book.
              </Section>
              <Section title="How it is used">
                Your details are used to schedule, confirm and remind you about appointments, and to
                let clinic staff reach you if a schedule changes. Staff can see the information needed
                to run appointments.
              </Section>
              <Section title="What we never do">
                We do not provide medical diagnoses, we do not run this app as a consultation channel,
                and we do not sell your data. Sensitive medical details should be discussed in the
                clinic, not entered here.
              </Section>
              <Section title="Analytics">
                We count simple, anonymous usage events (e.g. “booking started”) to improve the app.
                These events contain no personal or medical information and can be disabled by the clinic.
              </Section>
              <Section title="Your controls">
                You can edit your profile, cancel appointments before the clinic's cutoff time, or ask
                the clinic to remove your record.
              </Section>
            </div>
          ) : (
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <Section title="Purpose of the app">
                This app is for clinic discovery, appointment booking and communication with{" "}
                {clinic?.clinic.name ?? "the clinic"}. It is not an emergency service and not a
                substitute for medical consultation.
              </Section>
              <Section title="Appointments">
                Booking a slot creates a request (or an immediate booking when the clinic enables
                auto-confirmation). The clinic may confirm, reschedule or decline requests. Please
                arrive on time; repeated no-shows may affect future bookings at the clinic's discretion.
              </Section>
              <Section title="Cancellations">
                Appointments can be cancelled in the app up to the clinic's cutoff window before the
                start time. Later cancellations may require a phone call to the clinic.
              </Section>
              <Section title="Medical information">
                Do not rely on this app for medical advice, diagnosis or treatment decisions. In an
                emergency, contact your nearest hospital or emergency services.
              </Section>
              <Section title="Content accuracy">
                Clinic timings, services and prices are maintained by the clinic staff and may change.
                The doctor profile shows only information published by the clinic.
              </Section>
            </div>
          )}

          <div className="mt-6 space-y-2 rounded-xl bg-muted/70 p-3.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Contact: {clinic?.clinic.phone ?? "—"}
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {clinic?.clinic.address ?? "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1">{children}</p>
    </div>
  );
}
