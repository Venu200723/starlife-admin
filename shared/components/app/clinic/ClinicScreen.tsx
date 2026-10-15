"use client";

// Clinic tab — hub for doctor, services, timings and location.
import { UserRound, ClipboardList, Clock, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { ClinicStatusPill } from "../shared";
import { formatTime12h, DAY_NAMES } from "@/lib/time";

const TILES = [
  { key: "doctor", label: "Doctor", icon: UserRound, desc: "Profile & details" },
  { key: "services", label: "Services", icon: ClipboardList, desc: "What we offer" },
  { key: "hours", label: "Clinic Hours", icon: Clock, desc: "Weekly schedule" },
  { key: "location", label: "Location", icon: MapPin, desc: "Find & reach us" },
] as const;

export function ClinicScreen() {
  const clinic = useAppStore((s) => s.clinic);
  const loading = useAppStore((s) => s.clinicLoading);
  const { push } = useOverlayNav();

  if (loading && !clinic) {
    return (
      <div className="p-4" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {TILES.map((t) => (
            <Skeleton key={t.key} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (!clinic) return null;

  const weekday = new Date().getDay();
  const today = clinic.hours.find((h) => h.dayOfWeek === weekday);

  return (
    <div className="pb-6">
      <header className="px-4 pb-2 pt-5">
        <h1 className="text-xl font-bold tracking-tight">Clinic</h1>
        <p className="text-sm text-muted-foreground">{clinic.clinic.name} · {clinic.clinic.timezone.replace("_", " ")}</p>
      </header>

      <div className="mx-4 mt-1 flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
        <div>
          <p className="text-sm font-semibold">{DAY_NAMES[weekday]}</p>
          <p className="text-xs text-muted-foreground">
            {today?.isOpen
              ? `${formatTime12h(today.openingTime)} – ${formatTime12h(today.closingTime)}`
              : "Closed today"}
          </p>
        </div>
        <ClinicStatusPill isOpen={clinic.status.isOpen} size="lg" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        {TILES.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            onClick={() => push({ name: key })}
            className="rounded-2xl bg-card p-4 text-left shadow-sm ring-1 ring-border/60 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={label}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-3 font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </button>
        ))}
      </div>

      <div className="mx-4 mt-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
        <p className="text-sm font-semibold">About the clinic</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {clinic.clinic.description ??
            "STAR LIFE CLINIC is an outpatient clinic in Tiruchanur serving the local community. Timings and services are listed here and updated by the clinic."}
        </p>
      </div>
    </div>
  );
}
