"use client";

// Shared small components for the patient app.
import { ChevronLeft, Star, Clock, CheckCircle2, CheckCheck, XCircle, Ban, UserX, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import type { AppointmentStatus } from "@/types";
import { cn } from "@/lib/utils";

/* ---------------- Appointment status badge & helper ---------------- */

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  PENDING: { label: "Pending", icon: CircleDashed, cls: "bg-warning-soft text-warning" },
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2, cls: "bg-success-soft text-success" },
  COMPLETED: { label: "Completed", icon: CheckCheck, cls: "bg-secondary text-secondary-foreground" },
  CANCELLED: { label: "Cancelled", icon: XCircle, cls: "bg-error-soft text-destructive" },
  REJECTED: { label: "Declined", icon: Ban, cls: "bg-error-soft text-destructive" },
  NO_SHOW: { label: "Missed", icon: UserX, cls: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </span>
  );
}

export function statusHelperText(status: AppointmentStatus): string {
  switch (status) {
    case "PENDING":
      return "Your appointment request has been received. The clinic will confirm it shortly.";
    case "CONFIRMED":
      return "Your appointment is confirmed. Please arrive 10 minutes early.";
    case "COMPLETED":
      return "This visit is complete. Thank you for choosing STAR LIFE Clinic.";
    case "CANCELLED":
      return "This appointment was cancelled.";
    case "REJECTED":
      return "The clinic could not accept this request. Please call to reschedule.";
    case "NO_SHOW":
      return "The appointment was missed. Please book again if you still need to visit.";
    default:
      return "";
  }
}

/* ---------------- Clinic open/closed pill ---------------- */

export function ClinicStatusPill({
  isOpen,
  size = "sm",
  className,
}: {
  isOpen: boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
        isOpen ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "rounded-full",
          size === "lg" ? "h-2 w-2" : "h-1.5 w-1.5",
          isOpen ? "bg-success animate-pulse-soft" : "bg-muted-foreground",
        )}
      />
      {isOpen ? "OPEN NOW" : "CLOSED"}
      <span className="sr-only">{isOpen ? "The clinic is currently open" : "The clinic is currently closed"}</span>
    </span>
  );
}

/* ---------------- Header for overlay screens ---------------- */

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}) {
  const pop = useAppStore((s) => s.pop);
  const back = onBack ?? pop;
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-card/95 px-3 py-3 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        onClick={back}
        aria-label="Go back"
        className="shrink-0 rounded-full"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

/* ---------------- Misc atoms ---------------- */

export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Rated ${rating} out of 5`}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-semibold tabular">{rating.toFixed(1)}</span>
    </span>
  );
}

export function DurationChip({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" aria-hidden />
      {minutes} min
    </span>
  );
}

export function AvatarInitials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      aria-hidden
      className={cn(
        "brand-gradient flex items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
    >
      {initials || "SL"}
    </div>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-4">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export { STATUS_META };
