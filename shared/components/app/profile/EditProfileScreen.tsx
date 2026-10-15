"use client";

// Edit profile overlay.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { ScreenHeader } from "../shared";
import { apiFetch } from "@/lib/client/api";
import { profileUpdateSchema } from "@/lib/validation";
import type { PatientInfo } from "@/types";

export function EditProfileScreen() {
  const patient = useAppStore((s) => s.patient);
  const setPatient = useAppStore((s) => s.setPatient);
  const { pop } = useOverlayNav();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState(patient?.fullName ?? "");
  const [phone, setPhone] = useState(patient?.phone ?? "");
  const [age, setAge] = useState(patient?.age ? String(patient.age) : "");
  const [gender, setGender] = useState(patient?.gender ?? "");

  if (!patient) return null;

  const save = async () => {
    const parsed = profileUpdateSchema.safeParse({ fullName, phone, age, gender });
    if (!parsed.success) {
      toast({ title: "Please check the details", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    setBusy(true);
    const res = await apiFetch<PatientInfo>("/api/patient/profile", { method: "PUT", json: parsed.data });
    setBusy(false);
    if (res.ok && res.data) {
      setPatient({ ...patient, ...res.data });
      toast({ title: "Profile updated" });
      pop();
    } else {
      toast({ title: "Could not save", description: res.error?.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Edit Profile" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">Full name</Label>
            <Input id="ep-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-email">Email (sign-in)</Label>
            <Input id="ep-email" value={patient.email ?? ""} disabled aria-describedby="ep-email-note" />
            <p id="ep-email-note" className="text-[11px] text-muted-foreground">
              You sign in with this email — contact the clinic to change it.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-phone">Mobile number</Label>
            {patient.phone ? (
              <>
                <Input id="ep-phone" value={`+91 ${patient.phone}`} disabled aria-describedby="ep-phone-note" />
                <p id="ep-phone-note" className="text-[11px] text-muted-foreground">
                  Contact the clinic to change your number.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-input bg-muted px-3 py-2 text-sm font-semibold">+91</span>
                  <Input
                    id="ep-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Optional — the number you enter on the booking form is saved here automatically.
                </p>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-age">Age</Label>
              <Input id="ep-age" type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-gender">Gender</Label>
              <select
                id="ep-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <Button className="h-12 w-full rounded-xl font-bold" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
