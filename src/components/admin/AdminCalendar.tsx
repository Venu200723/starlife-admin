"use client";

// Admin calendar — month grid with load + blocks, and a day panel for
// blocking dates / time ranges and reviewing the day's bookings.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Ban, Plus, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/client/api";
import { AdminStatusBadge } from "./admin-ui";
import { formatTime12h } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

interface CalendarData {
  month: string;
  days: { date: string; total: number; pending: number; confirmed: number; completed: number; blockedDate: string | null }[];
  blockedSlots: { id: string; date: string; startTime: string; endTime: string; reason: string | null }[];
}

interface DayDetail {
  blockedDate: { id: string; reason: string | null } | null;
  blockedSlots: { id: string; startTime: string; endTime: string; reason: string | null }[];
  appointments: {
    id: string;
    code: string;
    startTime: string;
    endTime: string;
    status: AppointmentStatus;
    patientName: string;
    patientPhone: string;
    serviceName: string;
  }[];
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminCalendar({ refreshKey }: { refreshKey: number }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [data, setData] = useState<CalendarData | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const { toast } = useToast();

  const loadMonth = useCallback(async () => {
    const res = await apiFetch<CalendarData>(`/api/admin/calendar?month=${month}`);
    if (res.ok && res.data) setData(res.data);
  }, [month]);

  const loadDay = useCallback(async (date: string) => {
    const res = await apiFetch<DayDetail>(`/api/admin/blocks?date=${date}`);
    if (res.ok && res.data) setDetail(res.data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void loadMonth(), 0);
    return () => clearTimeout(t);
  }, [loadMonth, refreshKey]);

  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => void loadDay(selected), 0);
    return () => clearTimeout(t);
  }, [selected, loadDay, refreshKey]);

  // Keep selection inside the visible month
  useEffect(() => {
    if (data && !selected.startsWith(month)) {
      const firstDay = `${month}-01`;
      setSelected(firstDay);
    }
  }, [data, month, selected]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  const grid = useMemo(() => {
    if (!data) return [];
    const [y, m] = month.split("-").map(Number);
    const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const cells: (CalendarData["days"][number] | null)[] = Array(firstWeekday).fill(null);
    cells.push(...data.days);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [data, month]);

  const blockDate = async (reason: string) => {
    if (!selected) return;
    const res = await apiFetch("/api/admin/blocks", { method: "POST", json: { type: "date", date: selected, reason: reason || undefined } });
    if (res.ok) {
      toast({ title: "Date blocked", description: `${selected} is now blocked for bookings.` });
      void loadDay(selected);
      void loadMonth();
    } else toast({ title: "Could not block date", description: res.error?.message, variant: "destructive" });
  };

  const unblockDate = async () => {
    if (!selected) return;
    const res = await apiFetch(`/api/admin/blocks?type=date&id=${selected}`, { method: "DELETE" }).then(async (r) => r);
    // DELETE uses id of the blocked row, not the date — fetch detail to get row id.
    if (detail?.blockedDate) {
      const row = await apiFetch<{ blockedDate: { reason: string | null } | null }>(`/api/admin/blocks?date=${selected}`);
      void row;
    }
    void res;
    toast({ title: "Info", description: "Use the remove button next to the blocked date." });
  };

  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Booked load, blocked dates and time ranges.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold tabular">
            {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}
          </span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        {/* Month grid */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {WD.map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label="Appointment calendar">
            {grid.map((cell, i) =>
              cell ? (
                <button
                  key={cell.date}
                  onClick={() => setSelected(cell.date)}
                  aria-current={selected === cell.date ? "date" : undefined}
                  aria-label={`${cell.date}: ${cell.total} appointments${cell.blockedDate ? ", blocked" : ""}`}
                  className={cn(
                    "relative flex h-20 flex-col rounded-lg border p-1.5 text-left transition sm:h-24",
                    selected === cell.date ? "border-primary ring-2 ring-primary" : "hover:bg-muted/50",
                    cell.blockedDate && "bg-muted/60 border-dashed",
                  )}
                >
                  <span className={cn("text-xs font-bold tabular", cell.blockedDate && "line-through text-muted-foreground")}>
                    {Number(cell.date.slice(-2))}
                  </span>
                  {cell.blockedDate ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded bg-error-soft px-1 py-0.5 text-[9px] font-semibold text-destructive">
                      <Ban className="h-2.5 w-2.5" aria-hidden /> Blocked
                    </span>
                  ) : cell.total > 0 ? (
                    <span className="mt-1 inline-flex w-fit rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground tabular">
                      {cell.total} appt{cell.total === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {cell.pending > 0 && (
                    <span className="absolute bottom-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-warning" title={`${cell.pending} pending`} />
                  )}
                  {cell.confirmed > 0 && (
                    <span className="absolute bottom-1.5 left-4 h-1.5 w-1.5 rounded-full bg-success" title={`${cell.confirmed} confirmed`} />
                  )}
                </button>
              ) : (
                <span key={`empty-${i}`} aria-hidden className="h-20 rounded-lg bg-transparent sm:h-24" />
              ),
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" aria-hidden /> Pending</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" aria-hidden /> Confirmed</span>
            <span className="flex items-center gap-1.5"><Ban className="h-3 w-3 text-destructive" aria-hidden /> Blocked date</span>
          </div>
        </section>

        {/* Day panel */}
        <DayPanel
          selected={selected}
          detail={detail}
          onBlockDate={blockDate}
          onUnblockDate={async () => {
            if (!selected || !detail?.blockedDate) return;
            const res = await apiFetch(`/api/admin/blocks?type=date&id=${detail.blockedDate.id}`, { method: "DELETE" });
            if (res.ok) {
              toast({ title: "Date unblocked", description: "Patients can book this day again." });
            } else {
              toast({ title: "Could not unblock", description: res.error?.message, variant: "destructive" });
            }
            void loadDay(selected);
            void loadMonth();
          }}
          onBlockSlot={async (start, end, reason) => {
            const res = await apiFetch("/api/admin/blocks", {
              method: "POST",
              json: { type: "slot", date: selected, startTime: start, endTime: end, reason: reason || undefined },
            });
            if (res.ok) {
              toast({ title: "Time range blocked" });
              void loadDay(selected);
            } else {
              toast({ title: "Could not block time", description: res.error?.message, variant: "destructive" });
            }
          }}
          onUnblockSlot={async (id) => {
            const res = await apiFetch(`/api/admin/blocks?type=slot&id=${id}`, { method: "DELETE" });
            if (res.ok) {
              toast({ title: "Time range unblocked" });
              void loadDay(selected);
            }
          }}
        />
      </div>
    </div>
  );
}

function DayPanel({
  selected,
  detail,
  onBlockDate,
  onUnblockDate,
  onBlockSlot,
  onUnblockSlot,
}: {
  selected: string;
  detail: DayDetail | null;
  onBlockDate: (reason: string) => Promise<void>;
  onUnblockDate: () => Promise<void>;
  onBlockSlot: (start: string, end: string, reason: string) => Promise<void>;
  onUnblockSlot: (id: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotReason, setSlotReason] = useState("");

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="border-b px-4 py-3">
        <h2 className="font-semibold">
          {selected ? new Date(`${selected}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "Select a day"}
        </h2>
        <p className="text-xs text-muted-foreground">Manage blocks and review the day's bookings.</p>
      </header>

      <div className="space-y-4 p-4">
        {/* Block date */}
        <div className="rounded-xl border border-dashed p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Lock className="h-4 w-4 text-destructive" aria-hidden /> Full-day block
            </p>
            {detail?.blockedDate ? (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void onUnblockDate()}>
                <Unlock className="h-3.5 w-3.5" aria-hidden /> Unblock
              </Button>
            ) : (
              <Button size="sm" variant="destructive" className="h-8 gap-1.5" onClick={() => void onBlockDate(reason)}>
                <Ban className="h-3.5 w-3.5" aria-hidden /> Block date
              </Button>
            )}
          </div>
          {detail?.blockedDate ? (
            <p className="mt-2 text-xs text-destructive">
              Blocked{detail.blockedDate.reason ? ` — ${detail.blockedDate.reason}` : ""}
            </p>
          ) : (
            <Input
              className="mt-2"
              placeholder="Reason (optional) — holiday, leave, emergency…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-label="Block reason"
            />
          )}
        </div>

        {/* Block time range */}
        <div className="rounded-xl border border-dashed p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Plus className="h-4 w-4 text-primary" aria-hidden /> Block a time range
          </p>
          <div className="mt-2 flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="bs-start" className="text-xs">From</Label>
              <Input id="bs-start" type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="bs-end" className="text-xs">To</Label>
              <Input id="bs-end" type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
            </div>
          </div>
          <Input
            className="mt-2"
            placeholder="Reason (optional)"
            value={slotReason}
            onChange={(e) => setSlotReason(e.target.value)}
            aria-label="Time block reason"
          />
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full"
            onClick={() => void onBlockSlot(slotStart, slotEnd, slotReason)}
            disabled={!slotStart || !slotEnd}
          >
            Add block
          </Button>
          {detail && detail.blockedSlots.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {detail.blockedSlots.map((b) => (
                <li key={b.id} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
                  <span className="font-semibold tabular">
                    {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
                    {b.reason ? <span className="font-normal text-muted-foreground"> · {b.reason}</span> : null}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => void onUnblockSlot(b.id)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Day appointments */}
        <div>
          <p className="mb-2 text-sm font-semibold">Booked appointments</p>
          {!detail ? (
            <Skeleton className="h-24" />
          ) : detail.appointments.length === 0 ? (
            <p className="rounded-lg bg-muted/50 px-3 py-6 text-center text-xs text-muted-foreground">
              No appointments booked for this day.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {detail.appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      <span className="font-semibold tabular">{formatTime12h(a.startTime)}</span> · {a.patientName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.serviceName} · {a.patientPhone}
                    </p>
                  </div>
                  <AdminStatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
