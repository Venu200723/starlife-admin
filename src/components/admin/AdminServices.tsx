"use client";

// Admin services — CRUD with activate/deactivate; delete blocked when in use.
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/client/api";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  isActive: boolean;
  isDemo: boolean;
}

interface FormState {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  isActive: boolean;
}

const EMPTY: FormState = { name: "", description: "", durationMinutes: "30", price: "", isActive: true };

export function AdminServices({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<ServiceRow[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const res = await apiFetch<{ items: ServiceRow[] }>("/api/admin/services");
    if (res.ok && res.data) setRows(res.data.items);
    else setRows([]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (s: ServiceRow) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      durationMinutes: String(s.durationMinutes),
      price: s.price != null ? String(s.price) : "",
      isActive: s.isActive,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (form.name.trim().length < 2) {
      toast({ title: "Name required", description: "Give the service a descriptive name.", variant: "destructive" });
      return;
    }
    const duration = Number(form.durationMinutes);
    if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
      toast({ title: "Invalid duration", description: "Duration must be 5–480 minutes.", variant: "destructive" });
      return;
    }
    const priceRaw = form.price.trim();
    const price = priceRaw === "" ? null : Number(priceRaw);
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      toast({ title: "Invalid price", description: "Enter a valid price or leave it empty.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      durationMinutes: duration,
      price,
      isActive: form.isActive,
    };
    const res = editing
      ? await apiFetch(`/api/admin/services/${editing.id}`, { method: "PATCH", json: payload })
      : await apiFetch("/api/admin/services", { method: "POST", json: payload });
    setBusy(false);
    if (res.ok) {
      toast({ title: editing ? "Service updated" : "Service added" });
      setDialogOpen(false);
      void load();
    } else {
      toast({ title: "Save failed", description: res.error?.message, variant: "destructive" });
    }
  };

  const toggleActive = async (s: ServiceRow, next: boolean) => {
    const res = await apiFetch(`/api/admin/services/${s.id}`, {
      method: "PATCH",
      json: { isActive: next },
    });
    if (res.ok) void load();
    else toast({ title: "Update failed", description: res.error?.message, variant: "destructive" });
  };

  const remove = async (s: ServiceRow) => {
    const res = await apiFetch(`/api/admin/services/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Service deleted" });
      void load();
    } else {
      toast({ title: "Cannot delete", description: res.error?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            What patients can book. Empty price means “price on consultation”.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden /> Add service
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {rows === null ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No services yet. Add the clinic's real consultation services — the patient app shows exactly what you publish.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">
                        {s.name}
                        {s.isDemo && (
                          <span className="ml-2 rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning">
                            Demo seed
                          </span>
                        )}
                      </p>
                      {s.description && (
                        <p className="max-w-md truncate text-xs text-muted-foreground">{s.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="tabular">{s.durationMinutes} min</TableCell>
                    <TableCell className="tabular">{s.price != null ? `₹${s.price}` : "—"}</TableCell>
                    <TableCell>
                      <Switch checked={s.isActive} onCheckedChange={(v) => void toggleActive(s, v)} aria-label={`Toggle ${s.name}`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive"
                          onClick={() => void remove(s)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle>
            <DialogDescription>
              This is exactly what patients see in the app. Never add services that are not actually offered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sv-name">Service name</Label>
              <Input id="sv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. General Consultation" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-desc">Short description</Label>
              <Textarea id="sv-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sv-dur">Duration (minutes)</Label>
                <Input id="sv-dur" type="number" min={5} max={480} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sv-price">Price (₹, optional)</Label>
                <Input id="sv-price" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Leave empty if not fixed" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sv-active" className="text-sm font-normal">Visible to patients</Label>
              <Switch id="sv-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy}>
              {editing ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
