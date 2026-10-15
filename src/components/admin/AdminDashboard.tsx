"use client";

// Admin dashboard — stat cards, today's appointments table, weekly activity.
import { useCallback, useEffect, useState } from "react";
import { CalendarCheck2, Hourglass, CheckCircle2, CheckCheck, XCircle, CalendarClock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/client/api";
import { AdminStatusBadge, StatCard, AppointmentActions } from "./admin-ui";
import { formatTime12h } from "@/lib/time";
import type { AppointmentStatus } from "@/types";

interface OverviewAppointment {
  id: string;
  code: string;
  appointmentDate: string;
  startTime: string;
  status: AppointmentStatus;
  isToday: boolean;
  patientName: string;
  patientPhone: string;
  serviceName: string;
  patientNotes: string | null;
}

interface Overview {
  today: string;
  stats: {
    todayTotal: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    tomorrowTotal: number;
    upcomingBlocked: number;
  };
  appointments: OverviewAppointment[];
  activity: Record<string, number>;
}

export function AdminDashboard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<Overview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const res = await apiFetch<Overview>("/api/admin/overview");
    if (res.ok && res.data) setData(res.data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  // Light auto-refresh so staff see new requests without manual reloads.
  useEffect(() => {
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const changeStatus = async (id: string, next: AppointmentStatus) => {
    setBusyId(id);
    const res = await apiFetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      json: { status: next },
    });
    setBusyId(null);
    if (res.ok) {
      toast({ title: "Appointment updated", description: `Status changed to ${next.replace("_", " ").toLowerCase()}.` });
      void load();
    } else {
      toast({ title: "Update failed", description: res.error?.message, variant: "destructive" });
    }
  };

  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const s = data.stats;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Today · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Today's appointments" value={s.todayTotal} icon={<CalendarCheck2 className="h-4 w-4 text-muted-foreground" />} sub={`${s.tomorrowTotal} tomorrow`} />
        <StatCard label="Pending requests" value={s.pending} tone="warning" icon={<Hourglass className="h-4 w-4" />} sub="All dates" />
        <StatCard label="Confirmed (today)" value={s.confirmed} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Completed (today)" value={s.completed} icon={<CheckCheck className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Cancelled (today)" value={s.cancelled} tone="danger" icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Blocked days ahead" value={s.upcomingBlocked} tone="muted" icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <section className="rounded-xl border bg-card shadow-sm">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Today & tomorrow's appointments</h2>
          <span className="text-xs text-muted-foreground">{data.appointments.length} total</span>
        </header>
        {data.appointments.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No appointments scheduled for today or tomorrow. New requests will appear here automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {a.isToday ? "Today" : "Tomor."}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold tabular">{formatTime12h(a.startTime)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{a.patientName}</p>
                      {a.patientNotes && (
                        <p className="max-w-48 truncate text-xs text-muted-foreground" title={a.patientNotes}>
                          {a.patientNotes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{a.serviceName}</TableCell>
                    <TableCell className="hidden tabular md:table-cell">{a.patientPhone}</TableCell>
                    <TableCell><AdminStatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      <AppointmentActions
                        status={a.status}
                        busy={busyId === a.id}
                        onChange={(next) => changeStatus(a.id, next)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Patient activity (last 7 days)</h2>
        <p className="mb-3 text-xs text-muted-foreground">Anonymous, privacy-conscious usage events.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["APP_OPENED", "App opened"],
            ["BOOKING_STARTED", "Booking started"],
            ["BOOKING_COMPLETED", "Booking completed"],
            ["APPOINTMENT_CANCELLED", "Cancelled"],
            ["DIRECTIONS_CLICKED", "Directions"],
            ["CALL_CLICKED", "Calls"],
          ].map(([key, label]) => (
            <div key={key} className="rounded-lg bg-muted/60 px-3 py-2.5 text-center">
              <p className="text-lg font-bold tabular">{data.activity[key] ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
