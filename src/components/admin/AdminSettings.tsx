"use client";

// Admin settings — clinic info, doctors (add/edit/deactivate), weekly hours, booking rules.
// Unknown doctor details stay empty → patient app shows "Information coming soon".
import { useCallback, useEffect, useState } from "react";
import { Save, RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/client/api";
import { DAY_NAMES, formatTime12h } from "@/lib/time";
import type { ClinicData } from "@/types";

export function AdminSettings({ refreshKey }: { refreshKey: number }) {
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const { toast } = useToast();

  const [reloadN, setReloadN] = useState(0);
  const load = useCallback(async () => {
    // Admin-scoped endpoint — the staff site has no public /api/clinic.
    const res = await apiFetch<ClinicData>("/api/admin/clinic");
    if (res.ok && res.data) {
      setClinic(res.data);
      setReloadN((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  if (!clinic) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Clinic information, doctor profile, hours and booking rules.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </Button>
      </div>

      <ClinicInfoCard key={`c${reloadN}`} initial={clinic} onSaved={load} />
      <DoctorsCard key={`d${reloadN}`} />
      <HoursCard key={`h${reloadN}`} initial={clinic} onSaved={load} />
      <RulesCard key={`r${reloadN}`} initial={clinic} onSaved={load} />
    </div>
  );
}

function SectionCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{desc}</p>
      {children}
    </section>
  );
}

function ClinicInfoCard({ initial, onSaved }: { initial: ClinicData; onSaved: () => void }) {
  const c = initial.clinic;
  const [name, setName] = useState(c.name);
  const [phone, setPhone] = useState(c.phone);
  const [address, setAddress] = useState(c.address);
  const [mapsUrl, setMapsUrl] = useState(c.mapsUrl ?? "");
  const [description, setDescription] = useState(c.description ?? "");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setBusy(true);
    const res = await apiFetch("/api/admin/clinic", {
      method: "PUT",
      json: { clinic: { name, phone, address, mapsUrl, description } },
    });
    setBusy(false);
    if (res.ok) {
      toast({ title: "Clinic information saved" });
      onSaved();
    } else {
      toast({ title: "Save failed", description: res.error?.message, variant: "destructive" });
    }
  };

  return (
    <SectionCard title="Clinic information" desc="Shown on the patient app home screen and in legal pages.">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Clinic name" id="cl-name" value={name} onChange={setName} />
        <Field label="Phone" id="cl-phone" value={phone} onChange={setPhone} />
        <Field label="Address" id="cl-addr" value={address} onChange={setAddress} className="md:col-span-2" />
        <Field label="Google Maps URL" id="cl-maps" value={mapsUrl} onChange={setMapsUrl} className="md:col-span-2" />
        <Field label="Short description (optional)" id="cl-desc" value={description} onChange={setDescription} className="md:col-span-2" />
      </div>
      <SaveButton busy={busy} onClick={save} />
    </SectionCard>
  );
}

interface DoctorRow {
  id: string;
  name: string;
  bio: string | null;
  qualifications: string | null;
  specializations: string | null;
  experience: string | null;
  photoUrl: string | null;
  isActive: boolean;
  appointmentCount: number;
}

const EMPTY_DOCTOR_FORM = {
  name: "",
  qualifications: "",
  specializations: "",
  experience: "",
  bio: "",
};

/** Doctors management: add doctors, edit details, deactivate (hides from
 *  booking while keeping history), delete only when no history exists. */
function DoctorsCard() {
  const [rows, setRows] = useState<DoctorRow[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_DOCTOR_FORM });
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const res = await apiFetch<{ items: DoctorRow[] }>("/api/admin/doctors");
    if (res.ok && res.data) setRows(res.data.items);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setForm({ ...EMPTY_DOCTOR_FORM });
    setEditingId(null);
    setAdding(true);
  };

  const openEdit = (d: DoctorRow) => {
    setForm({
      name: d.name,
      qualifications: d.qualifications ?? "",
      specializations: d.specializations ?? "",
      experience: d.experience ?? "",
      bio: d.bio ?? "",
    });
    setAdding(false);
    setEditingId(d.id);
  };

  const closeForms = () => {
    setAdding(false);
    setEditingId(null);
    setForm({ ...EMPTY_DOCTOR_FORM });
  };

  const save = async () => {
    if (form.name.trim().length < 2) {
      toast({ title: "Check the name", description: "Doctor name is required.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const res = editingId
      ? await apiFetch(`/api/admin/doctors/${editingId}`, { method: "PATCH", json: form })
      : await apiFetch("/api/admin/doctors", { method: "POST", json: form });
    setBusy(false);
    if (res.ok) {
      toast({ title: editingId ? "Doctor updated" : "Doctor added" });
      closeForms();
      void load();
    } else {
      toast({ title: "Save failed", description: res.error?.message, variant: "destructive" });
    }
  };

  const setActive = async (d: DoctorRow, isActive: boolean) => {
    const res = await apiFetch(`/api/admin/doctors/${d.id}`, { method: "PATCH", json: { isActive } });
    if (res.ok) {
      toast({ title: isActive ? "Doctor activated" : "Doctor deactivated" });
      void load();
    } else {
      toast({ title: "Update failed", description: res.error?.message, variant: "destructive" });
    }
  };

  const remove = async (d: DoctorRow) => {
    const res = await apiFetch(`/api/admin/doctors/${d.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Doctor removed" });
      void load();
    } else {
      toast({ title: "Delete failed", description: res.error?.message, variant: "destructive" });
    }
  };

  const formFields = (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Doctor name" id="d-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field
        label="Qualifications"
        id="d-qual"
        value={form.qualifications}
        onChange={(v) => setForm({ ...form, qualifications: v })}
        placeholder="e.g. MBBS, MD (only if verified)"
      />
      <Field
        label="Specializations (comma separated)"
        id="d-spec"
        value={form.specializations}
        onChange={(v) => setForm({ ...form, specializations: v })}
        placeholder="Only if verified"
      />
      <Field
        label="Experience"
        id="d-exp"
        value={form.experience}
        onChange={(v) => setForm({ ...form, experience: v })}
        placeholder="e.g. 10+ years (only if verified)"
      />
      <Field label="Professional bio" id="d-bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} className="md:col-span-2" />
    </div>
  );

  return (
    <SectionCard
      title="Doctors"
      desc="Patients pick a doctor during booking. Only publish verified facts — empty fields show “Information coming soon” in the patient app. Deactivated doctors disappear from booking but keep their history."
    >
      {rows === null ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border">
            {rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No doctors yet — add the first one below.</p>
            ) : (
              rows.map((d, idx) => (
                <div key={d.id} className={`px-3 py-3 ${idx > 0 ? "border-t" : ""}`}>
                  {editingId === d.id ? (
                    <div className="space-y-3">
                      {formFields}
                      <div className="flex gap-2">
                        <SaveButton busy={busy} onClick={save} />
                        <Button variant="outline" className="mt-4" onClick={closeForms}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{d.name}</span>
                          {!d.isActive && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Inactive
                            </span>
                          )}
                          {d.appointmentCount > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              {d.appointmentCount} appointment{d.appointmentCount === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {[d.qualifications, d.specializations, d.experience].filter(Boolean).join(" · ") ||
                            "No verified details published yet"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(d)}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void setActive(d, !d.isActive)}
                          title={d.isActive ? "Hide from patient booking" : "Show in patient booking"}
                        >
                          {d.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        {d.appointmentCount === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            onClick={() => void remove(d)}
                            title="Delete permanently (no appointment history)"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {adding ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-semibold">New doctor</p>
              {formFields}
              <div className="flex gap-2">
                <SaveButton busy={busy} onClick={save} />
                <Button variant="outline" className="mt-4" onClick={closeForms}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden /> Add doctor
            </Button>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function HoursCard({ initial, onSaved }: { initial: ClinicData; onSaved: () => void }) {
  const [rows, setRows] = useState(
    DAY_NAMES.map((_, i) => {
      const h = initial.hours.find((x) => x.dayOfWeek === i);
      return {
        dayOfWeek: i,
        isOpen: h?.isOpen ?? false,
        openingTime: h?.openingTime ?? "09:00",
        closingTime: h?.closingTime ?? "17:00",
      };
    }),
  );
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setBusy(true);
    const res = await apiFetch("/api/admin/hours", { method: "PUT", json: { hours: rows } });
    setBusy(false);
    if (res.ok) {
      toast({ title: "Clinic hours saved" });
      onSaved();
    } else {
      toast({ title: "Save failed", description: res.error?.message, variant: "destructive" });
    }
  };

  return (
    <SectionCard title="Clinic hours" desc="Timings in Asia/Kolkata (IST). Availability is calculated from these hours.">
      <div className="overflow-hidden rounded-lg border">
        {rows.map((row, idx) => (
          <div
            key={row.dayOfWeek}
            className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${idx > 0 ? "border-t" : ""} ${row.isOpen ? "" : "bg-muted/40"}`}
          >
            <div className="flex w-32 items-center gap-2">
              <Switch
                checked={row.isOpen}
                onCheckedChange={(v) => setRows(rows.map((r) => (r.dayOfWeek === row.dayOfWeek ? { ...r, isOpen: v } : r)))}
                aria-label={`${DAY_NAMES[row.dayOfWeek]} open`}
              />
              <span className="text-sm font-medium">{DAY_NAMES[row.dayOfWeek].slice(0, 3)}</span>
            </div>
            {row.isOpen ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  className="w-28"
                  value={row.openingTime}
                  onChange={(e) => setRows(rows.map((r) => (r.dayOfWeek === row.dayOfWeek ? { ...r, openingTime: e.target.value } : r)))}
                  aria-label={`${DAY_NAMES[row.dayOfWeek]} opening time`}
                />
                <span className="text-sm text-muted-foreground">–</span>
                <Input
                  type="time"
                  className="w-28"
                  value={row.closingTime}
                  onChange={(e) => setRows(rows.map((r) => (r.dayOfWeek === row.dayOfWeek ? { ...r, closingTime: e.target.value } : r)))}
                  aria-label={`${DAY_NAMES[row.dayOfWeek]} closing time`}
                />
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  ({formatTime12h(row.openingTime)} – {formatTime12h(row.closingTime)})
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </div>
        ))}
      </div>
      <SaveButton busy={busy} onClick={save} />
    </SectionCard>
  );
}

function RulesCard({ initial, onSaved }: { initial: ClinicData; onSaved: () => void }) {
  const clinic = initial.clinic;
  void clinic;
  const s = initial.settings;
  const [slotStep, setSlotStep] = useState(String(s.slotStepMinutes));
  const [maxDays, setMaxDays] = useState(String(s.maxAdvanceDays));
  const [cutoff, setCutoff] = useState(String(s.cancellationCutoffHours));
  const [autoConfirm, setAutoConfirm] = useState(s.autoConfirm);
  const [bookingEnabled, setBookingEnabled] = useState(s.bookingEnabled);
  const [notifications, setNotifications] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [whatsapp, setWhatsapp] = useState(s.whatsappEnabled);
  const [whatsappNumber, setWhatsappNumber] = useState(s.whatsappNumber ?? "");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setBusy(true);
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      json: {
        slot_step_minutes: Number(slotStep) || 30,
        max_advance_days: Number(maxDays) || 30,
        cancellation_cutoff_hours: Number(cutoff) || 0,
        auto_confirm: autoConfirm,
        booking_enabled: bookingEnabled,
        notifications_enabled: notifications,
        analytics_enabled: analytics,
        whatsapp_enabled: whatsapp,
        whatsapp_number: whatsappNumber,
      },
    });
    setBusy(false);
    if (res.ok) {
      toast({ title: "Booking rules saved" });
      onSaved();
    } else {
      toast({ title: "Save failed", description: res.error?.message, variant: "destructive" });
    }
  };

  return (
    <SectionCard title="Booking rules & notifications" desc="How slots are generated and how patients interact with bookings.">
      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label="Slot interval (minutes)"
          id="rl-slot"
          value={slotStep}
          onChange={setSlotStep}
          type="number"
          hint="Grid step between appointment start times"
        />
        <Field
          label="Booking window (days ahead)"
          id="rl-window"
          value={maxDays}
          onChange={setMaxDays}
          type="number"
        />
        <Field
          label="Cancellation cutoff (hours before)"
          id="rl-cutoff"
          value={cutoff}
          onChange={setCutoff}
          type="number"
        />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <ToggleRow
          id="rl-booking"
          label="Online booking enabled"
          desc="When off, the app asks patients to call instead."
          checked={bookingEnabled}
          onChange={setBookingEnabled}
        />
        <ToggleRow
          id="rl-auto"
          label="Auto-confirm bookings"
          desc="On: bookings are instantly confirmed. Off: staff review each request."
          checked={autoConfirm}
          onChange={setAutoConfirm}
        />
        <ToggleRow
          id="rl-notif"
          label="Patient notifications"
          desc="In-app updates and reminders for appointments."
          checked={notifications}
          onChange={setNotifications}
        />
        <ToggleRow
          id="rl-analytics"
          label="Privacy-conscious analytics"
          desc="Anonymous event counters only — no personal data."
          checked={analytics}
          onChange={setAnalytics}
        />
        <ToggleRow
          id="rl-wa"
          label="WhatsApp contact"
          desc="Show “Chat on WhatsApp” when an official number is provided."
          checked={whatsapp}
          onChange={setWhatsapp}
        />
        {whatsapp && (
          <div className="space-y-1.5 rounded-lg border p-3">
            <Label htmlFor="rl-wa-num" className="text-sm">WhatsApp number (with country code)</Label>
            <Input
              id="rl-wa-num"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g. 917780193811"
            />
          </div>
        )}
      </div>
      <SaveButton busy={busy} onClick={save} />
    </SectionCard>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  className,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  desc,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SaveButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <Button className="mt-4 gap-2" onClick={onClick} disabled={busy}>
      <Save className="h-4 w-4" aria-hidden />
      {busy ? "Saving…" : "Save changes"}
    </Button>
  );
}
