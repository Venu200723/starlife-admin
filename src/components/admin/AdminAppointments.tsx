"use client";

// Admin appointments — search, filter, status management, pagination.
import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/client/api";
import { AdminStatusBadge, AppointmentActions } from "./admin-ui";
import { formatDateMedium, formatTime12h } from "@/lib/time";
import type { AppointmentStatus } from "@/types";

interface Row {
  id: string;
  code: string;
  appointmentDate: string;
  startTime: string;
  status: AppointmentStatus;
  patientNotes: string | null;
  adminNotes: string | null;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientGender: string | null;
  serviceName: string;
}

const STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"];

export function AdminAppointments({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("ALL");
  const [date, setDate] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const pageSize = 15;
  const { toast } = useToast();

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status !== "ALL") params.set("status", status);
    if (date) params.set("date", date);
    if (q.trim()) params.set("q", q.trim());
    const res = await apiFetch<{ total: number; items: Row[] }>(`/api/admin/appointments?${params}`);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setTotal(res.data.total);
    } else setRows([]);
  }, [page, status, date, q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  const changeStatus = async (id: string, next: AppointmentStatus) => {
    setBusyId(id);
    const res = await apiFetch(`/api/admin/appointments/${id}`, { method: "PATCH", json: { status: next } });
    setBusyId(null);
    if (res.ok) {
      toast({ title: "Appointment updated", description: `Status changed to ${next.replace("_", " ").toLowerCase()}.` });
      void load();
    } else {
      toast({ title: "Update failed", description: res.error?.message, variant: "destructive" });
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">Search, filter and manage all appointments.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-8"
            placeholder="Search name, phone or appointment ID…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Search appointments"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", "-")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-40"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by date"
        />
        {(status !== "ALL" || date || q) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus("ALL");
              setDate("");
              setQ("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {rows === null ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No appointments match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden lg:table-cell">Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{a.code}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateMedium(a.appointmentDate)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-semibold tabular">{formatTime12h(a.startTime)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{a.patientName}</p>
                      <p className="text-xs tabular text-muted-foreground">
                        {a.patientPhone}
                        {a.patientAge != null ? ` · ${a.patientAge}y` : ""}
                        {a.patientGender ? ` · ${a.patientGender.charAt(0)}${a.patientGender.slice(1).toLowerCase()}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-sm lg:table-cell">{a.serviceName}</TableCell>
                    <TableCell><AdminStatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      <AppointmentActions status={a.status} busy={busyId === a.id} onChange={(next) => changeStatus(a.id, next)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total} appointment{total === 1 ? "" : "s"} · page {page} of {pages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
