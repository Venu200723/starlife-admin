"use client";

// 5-step booking flow: Service → Date → Time → Patient details → Review.
// Availability is always fetched from the server; conflicts surface as a
// friendly "slot just taken" message with one tap back to time selection.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CalendarX2, CheckCircle2, ChevronLeft, Clock, IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { apiFetch, track } from "@/lib/client/api";
import { patientDetailsSchema, type PatientDetails } from "@/lib/validation";
import { addDays, dateParts, formatDateLong, formatTime12h, weekdayOfDate } from "@/lib/time";
import type { BookingConfirmation } from "@/types";
import { cn } from "@/lib/utils";

interface Availability {
  date: string;
  slots: { start: string; end: string; available: boolean }[];
  closed: boolean;
  closedReason: string | null;
  doctorId?: string;
  doctorName?: string;
}

const STEP_LABELS = ["Service", "Date", "Time", "Details", "Review"];

export function BookingFlow() {
  const clinic = useAppStore((s) => s.clinic);
  const { pop, resetStack, push } = useOverlayNav();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [details, setDetails] = useState<PatientDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const services = clinic?.services ?? [];
  const service = services.find((s) => s.id === serviceId);
  const doctors = clinic?.doctors ?? [];
  // Effective doctor: explicit selection, else the clinic's primary doctor.
  const effectiveDoctorId = doctorId || doctors[0]?.id || clinic?.doctor?.id || "";
  const selectedDoctor = doctors.find((d) => d.id === effectiveDoctorId) ?? clinic?.doctor ?? null;

  const confirmBooking = async (d: PatientDetails) => {
    if (!clinic || !service || !date || !startTime) return;
    setSubmitting(true);
    const res = await apiFetch<{ id: string; code: string; status: string }>("/api/appointments", {
      method: "POST",
      json: {
        serviceId,
        doctorId: effectiveDoctorId || undefined,
        appointmentDate: date,
        startTime,
        patient: {
          fullName: d.fullName,
          phone: d.phone,
          age: d.age,
          gender: d.gender,
          email: d.email || "",
          notes: d.notes || "",
        },
      },
    });
    setSubmitting(false);

    if (res.ok && res.data) {
      track("BOOKING_COMPLETED");
      const confirmation: BookingConfirmation = {
        id: res.data.id,
        code: res.data.code,
        status: res.data.status,
        serviceName: service.name,
        doctorName: selectedDoctor?.name ?? "Doctor",
        date,
        time: startTime,
        patientName: d.fullName,
        phone: d.phone,
      };
      resetStack();
      push({ name: "confirmation", confirmation });
      return;
    }

    if (res.error?.code === "CONFLICT_SLOT_TAKEN") {
      toast({ title: "Slot unavailable", description: res.error.message, variant: "destructive" });
      setStartTime("");
      setStep(3);
      return;
    }
    toast({ title: "Booking failed", description: res.error?.message ?? "Please try again.", variant: "destructive" });
  };

  if (!clinic) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 border-b bg-card/95 px-3 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step === 1 ? pop() : setStep(step - 1))}
            aria-label={step === 1 ? "Close booking" : "Previous step"}
            className="shrink-0 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold leading-tight">Book Appointment</h1>
            <p className="text-xs text-muted-foreground">
              Step {step} of 5 · {STEP_LABELS[step - 1]}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex gap-1 px-1" aria-hidden>
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i + 1 <= step ? "bg-primary" : "bg-border")} />
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        {step === 1 && (
          <ServiceStep services={services} selected={serviceId} onSelect={(id) => { setServiceId(id); setStep(2); }} />
        )}
        {step === 2 && (
          <DateStep
            maxAdvanceDays={clinic.settings.maxAdvanceDays}
            hours={clinic.hours}
            doctors={doctors}
            selectedDoctorId={effectiveDoctorId}
            onDoctorSelect={(id) => {
              setDoctorId(id);
              setDate("");
              setStartTime("");
            }}
            selected={date}
            onSelect={(d) => { setDate(d); setStartTime(""); setStep(3); }}
          />
        )}
        {step === 3 && (
          <TimeStep
            serviceId={serviceId}
            doctorId={effectiveDoctorId}
            date={date}
            selected={startTime}
            onSelect={(t) => { setStartTime(t); setStep(4); }}
          />
        )}
        {step === 4 && (
          <DetailsStep
            onDone={(d) => {
              setDetails(d);
              setStep(5);
            }}
          />
        )}
        {step === 5 && details && service && (
          <ReviewStep
            clinicName={clinic.clinic.name}
            doctorName={clinic.doctor?.name ?? "Doctor"}
            serviceName={service.name}
            date={date}
            time={startTime}
            duration={service.durationMinutes}
            details={details}
            autoConfirm={clinic.settings.autoConfirm}
            submitting={submitting}
            onEdit={() => setStep(4)}
            onConfirm={() => confirmBooking(details)}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------- Step 1: Service ------------------------- */

function ServiceStep({
  services,
  selected,
  onSelect,
}: {
  services: { id: string; name: string; description: string | null; durationMinutes: number; price: number | null; isDemo: boolean }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  if (services.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-border/60">
        <p className="font-semibold">No services published yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The clinic hasn't published its consultation services yet. Please call the clinic to book a visit.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">Select the consultation you need.</p>
      <ul className="space-y-2.5" role="radiogroup" aria-label="Select a service">
        {services.map((s) => (
          <li key={s.id}>
            <button
              role="radio"
              aria-checked={selected === s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "w-full rounded-2xl bg-card p-4 text-left shadow-sm ring-1 transition focus-visible:outline-2 focus-visible:outline-ring",
                selected === s.id ? "ring-2 ring-primary" : "ring-border/60 hover:shadow-md",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  {s.name}
                  {s.isDemo && (
                    <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning">
                      Demo
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    selected === s.id ? "border-primary bg-primary" : "border-input",
                  )}
                  aria-hidden
                >
                  {selected === s.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.description ?? "Consultation at the clinic."}</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
                  <Clock className="h-3 w-3" aria-hidden /> {s.durationMinutes} min
                </span>
                {s.price != null ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-1 font-semibold text-secondary-foreground">
                    <IndianRupee className="h-3 w-3" aria-hidden />
                    {s.price}
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">Price on consultation</span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------- Step 2: Date ------------------------- */

function DateStep({
  maxAdvanceDays,
  hours,
  doctors,
  selectedDoctorId,
  onDoctorSelect,
  selected,
  onSelect,
}: {
  maxAdvanceDays: number;
  hours: { dayOfWeek: number; isOpen: boolean; openingTime: string; closingTime: string }[];
  doctors: { id: string; name: string }[];
  selectedDoctorId: string;
  onDoctorSelect: (id: string) => void;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const days = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
    return Array.from({ length: Math.min(Math.max(maxAdvanceDays, 7), 60) }, (_, i) => addDays(todayStr, i));
  }, [maxAdvanceDays]);

  return (
    <div>
      {doctors.length > 1 && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-muted-foreground">Choose a doctor.</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select a doctor">
            {doctors.map((d) => {
              const active = d.id === selectedDoctorId;
              return (
                <button
                  key={d.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => onDoctorSelect(d.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium ring-1 transition focus-visible:outline-2 focus-visible:outline-ring",
                    active
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-card ring-border/60 hover:shadow-md",
                  )}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="mb-3 text-sm text-muted-foreground">Choose a day. Days the clinic is closed are dimmed.</p>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Select a date">
        {days.map((d) => {
          const wd = weekdayOfDate(d);
          const open = hours.find((h) => h.dayOfWeek === wd)?.isOpen ?? false;
          const parts = dateParts(d);
          const active = selected === d;
          return (
            <button
              key={d}
              role="radio"
              aria-checked={active}
              disabled={!open}
              onClick={() => onSelect(d)}
              className={cn(
                "flex flex-col items-center rounded-xl py-2.5 ring-1 transition focus-visible:outline-2 focus-visible:outline-ring",
                active
                  ? "bg-primary text-primary-foreground ring-primary"
                  : open
                    ? "bg-card ring-border/60 hover:shadow-md"
                    : "cursor-not-allowed bg-muted/50 text-muted-foreground/50 ring-border/40",
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide">{parts.weekdayShort}</span>
              <span className="text-lg font-bold leading-tight tabular">{parts.day}</span>
              <span className="text-[10px]">{parts.monthShort}</span>
              {!open && <span className="mt-0.5 text-[9px] uppercase">Closed</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarX2 className="h-3.5 w-3.5" aria-hidden />
        Booking window: up to {maxAdvanceDays} days in advance.
      </p>
    </div>
  );
}

/* ------------------------- Step 3: Time ------------------------- */

function TimeStep({
  serviceId,
  doctorId,
  date,
  selected,
  onSelect,
}: {
  serviceId: string;
  doctorId: string;
  date: string;
  selected: string;
  onSelect: (time: string) => void;
}) {
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch<Availability>(
      `/api/availability?date=${date}&serviceId=${serviceId}${doctorId ? `&doctorId=${encodeURIComponent(doctorId)}` : ""}`,
    );
    if (res.ok && res.data) setData(res.data);
    setLoading(false);
  }, [date, serviceId, doctorId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading available times">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.closed) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-border/60">
        <CalendarX2 className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
        <p className="mt-3 font-semibold">
          {data?.closedReason === "BLOCKED_DATE"
            ? "The clinic is unavailable on this day"
            : "The clinic is closed on this day"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Please go back and pick another date.</p>
      </div>
    );
  }

  const free = data.slots.filter((s) => s.available).length;
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {free > 0
          ? `${free} time${free === 1 ? "" : "s"} available on ${formatDateLong(date)}.`
          : "No times are left on this day. Please pick another date."}
      </p>
      {data.slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Select a time">
          {data.slots.map((s) => {
            const active = selected === s.start;
            return (
              <button
                key={s.start}
                role="radio"
                aria-checked={active}
                disabled={!s.available}
                onClick={() => onSelect(s.start)}
                className={cn(
                  "flex flex-col items-center rounded-xl px-1 py-2.5 text-sm ring-1 transition focus-visible:outline-2 focus-visible:outline-ring",
                  active
                    ? "bg-primary text-primary-foreground ring-primary"
                    : s.available
                      ? "bg-card ring-border/60 hover:shadow-md"
                      : "cursor-not-allowed bg-muted/50 text-muted-foreground/50 ring-border/40",
                )}
              >
                <span className="font-semibold tabular">{formatTime12h(s.start)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------- Step 4: Details ------------------------- */

type DetailsForm = {
  fullName: string;
  phone: string;
  age: string;
  gender: "MALE" | "FEMALE" | "OTHER" | undefined;
  email: string;
  notes: string;
};

function DetailsStep({ onDone }: { onDone: (d: PatientDetails) => void }) {
  const patient = useAppStore((s) => s.patient);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DetailsForm>({
    defaultValues: {
      fullName: patient?.fullName ?? "",
      phone: patient?.phone ?? "",
      age: patient?.age ? String(patient.age) : "",
      gender: (patient?.gender as DetailsForm["gender"]) || undefined,
      email: patient?.email ?? "",
      notes: "",
    },
  });

  const onSubmit = (raw: DetailsForm) => {
    const parsed = patientDetailsSchema.safeParse(raw);
    if (!parsed.success) {
      toast({
        title: "Please check the details",
        description: parsed.error.issues[0]?.message ?? "Some fields need attention.",
        variant: "destructive",
      });
      return;
    }
    onDone(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">
        We only collect what's needed to manage your appointment. The clinic uses this number to contact you about the visit.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="bk-name">Full name *</Label>
        <Input
          id="bk-name"
          placeholder="Patient's full name"
          autoComplete="name"
          aria-invalid={!!errors.fullName}
          {...register("fullName", { required: "Please enter the patient's full name", minLength: 2 })}
        />
        {errors.fullName && (
          <p className="text-xs text-destructive">{errors.fullName.message ?? "Please enter the patient's full name"}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bk-phone">Mobile number *</Label>
          <Input
            id="bk-phone"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            {...register("phone", { required: true })}
          />
          {errors.phone && <p className="text-xs text-destructive">Enter a valid 10-digit Indian mobile number</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bk-age">Age *</Label>
          <Input
            id="bk-age"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            placeholder="Years"
            aria-invalid={!!errors.age}
            {...register("age", { required: true })}
          />
          {errors.age && <p className="text-xs text-destructive">Age is required</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Gender *</Label>
        <Controller
          control={control}
          name="gender"
          rules={{ required: true }}
          render={({ field }) => (
            <div className="flex gap-2">
              {[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ].map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                    field.value === o.value
                      ? "border-primary bg-secondary text-secondary-foreground"
                      : "border-input bg-card hover:bg-muted/50",
                  )}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={o.value}
                    checked={field.value === o.value}
                    onChange={() => field.onChange(o.value)}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}
        />
        {errors.gender && <p className="text-xs text-destructive">Please select a gender</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bk-email">Email (optional)</Label>
        <Input id="bk-email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bk-notes">Reason for visit / notes (optional)</Label>
        <Textarea
          id="bk-notes"
          rows={3}
          maxLength={500}
          placeholder="e.g. Fever since two days (never share sensitive medical details here)"
          {...register("notes")}
        />
        <p className="text-[11px] text-muted-foreground">This is not a medical consultation channel.</p>
      </div>

      <Button type="submit" className="h-12 w-full rounded-xl text-base font-bold">
        Review booking
      </Button>
    </form>
  );
}

/* ------------------------- Step 5: Review ------------------------- */

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function ReviewStep({
  clinicName,
  doctorName,
  serviceName,
  date,
  time,
  duration,
  details,
  autoConfirm,
  submitting,
  onEdit,
  onConfirm,
}: {
  clinicName: string;
  doctorName: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  details: PatientDetails;
  autoConfirm: boolean;
  submitting: boolean;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold">Appointment summary</h3>
          <button onClick={onEdit} className="text-sm font-medium text-primary hover:underline">
            Edit
          </button>
        </div>
        <div className="divide-y divide-border/70">
          <ReviewRow label="Clinic" value={clinicName} />
          <ReviewRow label="Doctor" value={doctorName} />
          <ReviewRow label="Service" value={serviceName} />
          <ReviewRow label="Date" value={formatDateLong(date)} />
          <ReviewRow label="Time" value={`${formatTime12h(time)} · ${duration} min`} />
          <ReviewRow label="Patient" value={details.fullName} />
          <ReviewRow label="Phone" value={`+91 ${details.phone}`} />
          {details.notes ? <ReviewRow label="Notes" value={details.notes} /> : null}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/70 p-3 text-xs leading-relaxed text-secondary-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {autoConfirm
          ? "Your appointment will be confirmed immediately. You can cancel free of charge until shortly before the start time."
          : "Your request will be reviewed by the clinic — you'll be notified once it is confirmed. You can cancel anytime before it starts."}
      </div>

      <Button
        className="mt-4 h-13 w-full rounded-xl text-base font-bold shadow-md shadow-primary/20"
        onClick={onConfirm}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Confirming…
          </>
        ) : (
          "CONFIRM APPOINTMENT"
        )}
      </Button>
    </div>
  );
}
