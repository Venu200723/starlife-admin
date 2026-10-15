"use client";

// Shared admin UI atoms: status badges, stat cards, status action menu.
import { useState } from "react";
import { CircleDashed, CheckCircle2, CheckCheck, XCircle, Ban, UserX, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { AppointmentStatus } from "@/types";
import { cn } from "@/lib/utils";

export const ADMIN_STATUS_META: Record<
  AppointmentStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  PENDING: { label: "Pending", icon: CircleDashed, cls: "bg-warning-soft text-warning" },
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2, cls: "bg-success-soft text-success" },
  COMPLETED: { label: "Completed", icon: CheckCheck, cls: "bg-secondary text-secondary-foreground" },
  CANCELLED: { label: "Cancelled", icon: XCircle, cls: "bg-error-soft text-destructive" },
  REJECTED: { label: "Rejected", icon: Ban, cls: "bg-error-soft text-destructive" },
  NO_SHOW: { label: "No-show", icon: UserX, cls: "bg-muted text-muted-foreground" },
};

export function AdminStatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = ADMIN_STATUS_META[status] ?? ADMIN_STATUS_META.PENDING;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", meta.cls)}>
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
  icon,
  sub,
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "success" | "muted" | "danger";
  icon?: React.ReactNode;
  sub?: string;
}) {
  const tones = {
    default: "text-foreground",
    warning: "text-warning",
    success: "text-success",
    muted: "text-muted-foreground",
    danger: "text-destructive",
  } as const;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className={cn("mt-1 text-2xl font-bold tabular", tones[tone])}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Actions dropdown for one appointment row, with confirmation for negative actions. */
export function AppointmentActions({
  status,
  busy,
  onChange,
}: {
  status: AppointmentStatus;
  busy?: boolean;
  onChange: (next: AppointmentStatus) => void | Promise<void>;
}) {
  const [confirm, setConfirm] = useState<AppointmentStatus | null>(null);

  const allItems: { next: AppointmentStatus; label: string; danger?: boolean; hidden?: boolean }[] = [
    { next: "CONFIRMED", label: "Confirm", hidden: status === "CONFIRMED" },
    { next: "COMPLETED", label: "Mark complete", hidden: status === "COMPLETED" },
    { next: "NO_SHOW", label: "Mark no-show", hidden: status === "NO_SHOW", danger: true },
    { next: "REJECTED", label: "Reject request", hidden: status === "REJECTED", danger: true },
    { next: "CANCELLED", label: "Cancel appointment", hidden: status === "CANCELLED", danger: true },
    { next: "PENDING", label: "Re-open as pending", hidden: status === "PENDING" },
  ];
  const items = allItems.filter((i) => !i.hidden);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Appointment actions" disabled={busy}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {items.map((item, idx) => (
            <div key={item.next}>
              {idx === 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() =>
                  item.danger || item.next === "PENDING" ? setConfirm(item.next) : void onChange(item.next)
                }
                className={item.danger ? "text-destructive focus:text-destructive" : ""}
              >
                {item.label}
              </DropdownMenuItem>
            </div>
          ))}
          {items.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No actions</p>}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change status to “{confirm && ADMIN_STATUS_META[confirm].label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The patient will be notified about this change. This action updates the appointment immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current status</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirm) await onChange(confirm);
                setConfirm(null);
              }}
              className={confirm === "CANCELLED" || confirm === "REJECTED" || confirm === "NO_SHOW" ? "bg-destructive text-white hover:bg-destructive/90" : ""}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
