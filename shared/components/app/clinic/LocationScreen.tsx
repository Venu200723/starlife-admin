"use client";

// Location screen — address, map link and calling.
import { MapPin, Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { ScreenHeader } from "../shared";
import { CallClinicButton } from "../CallClinicButton";
import { openDirections } from "@/lib/client/api";

export function LocationScreen() {
  const clinic = useAppStore((s) => s.clinic);
  if (!clinic) return null;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Location" subtitle="How to reach the clinic" />
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/60">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <MapPin className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="font-bold">{clinic.clinic.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{clinic.clinic.address}</p>
            </div>
          </div>

          <Button
            className="mt-4 h-12 w-full gap-2 rounded-xl text-base font-bold"
            onClick={() => openDirections(clinic.clinic.mapsUrl, clinic.clinic.address)}
          >
            <Navigation className="h-5 w-5" aria-hidden />
            GET DIRECTIONS
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Opens in Google Maps. If no maps app is available, copy the address above.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
            <span className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
              {clinic.clinic.phone}
            </span>
            <CallClinicButton
              phone={clinic.clinic.phone}
              label="Call"
              variant="outline"
              size="sm"
              className="rounded-lg"
              showIcon={false}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted-foreground shadow-sm ring-1 ring-border/60">
          <p className="font-semibold text-foreground">Tips for your first visit</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Arrive about 10 minutes before your appointment time.</li>
            <li>Carry any previous prescriptions or reports if relevant.</li>
            <li>Check the live open status on the home screen before leaving.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
