"use client";

// Admin patients — minimal directory needed for appointment management.
import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client/api";
import { formatDateMedium } from "@/lib/time";

interface PatientRow {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  age: number | null;
  gender: string | null;
  appointmentCount: number;
  lastAppointmentDate: string | null;
}

export function AdminPatients({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<PatientRow[] | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const res = await apiFetch<{ items: PatientRow[] }>(`/api/admin/patients${params}`);
    if (res.ok && res.data) setRows(res.data.items);
    else setRows([]);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Only the contact details patients provided for appointments — nothing more is collected.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-8"
            placeholder="Search by name, phone or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search patients"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {rows === null ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">No patients found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Age / Gender</TableHead>
                  <TableHead>Appointments</TableHead>
                  <TableHead>Last visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.fullName ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {p.phone ? (
                        <span className="tabular">+91 {p.phone}</span>
                      ) : p.email ? (
                        <span className="text-muted-foreground">{p.email}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.age != null ? `${p.age} yrs` : "—"}
                      {p.gender ? ` · ${p.gender.charAt(0)}${p.gender.slice(1).toLowerCase()}` : ""}
                    </TableCell>
                    <TableCell className="tabular">{p.appointmentCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.lastAppointmentDate ? formatDateMedium(p.lastAppointmentDate) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
