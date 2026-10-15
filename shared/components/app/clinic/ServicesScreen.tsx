"use client";

// Services list — booking entry point for each service.
// Demo seed entries are clearly badged; prices only shown when configured.
import { Clock, IndianRupee, Info, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/app-store";
import { useOverlayNav } from "../OverlayLayer";
import { CallClinicButton } from "../CallClinicButton";
import { ScreenHeader } from "../shared";
import { track } from "@/lib/client/api";

export function ServicesScreen() {
  const clinic = useAppStore((s) => s.clinic);
  const loading = useAppStore((s) => s.clinicLoading);
  const { push } = useOverlayNav();

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Services" subtitle="Consultations offered at the clinic" />
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        {loading && !clinic ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : !clinic || clinic.services.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-sm ring-1 ring-border/60">
            <Info className="h-8 w-8 text-muted-foreground/60" aria-hidden />
            <p className="mt-3 font-semibold">Services will be updated soon</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              The clinic is preparing its service list. You can call the clinic to ask about
              consultations, or book a general visit once services are published.
            </p>
            <CallClinicButton
              phone={clinic?.clinic.phone ?? ""}
              label="Call the clinic"
              variant="outline"
              className="mt-4 rounded-xl"
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {clinic.services.map((s) => (
              <li key={s.id} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      {s.isDemo && (
                        <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {s.description ?? "Consultation at the clinic."}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden /> {s.durationMinutes} min
                      </span>
                      {s.price != null ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-1 font-semibold text-secondary-foreground">
                          <IndianRupee className="h-3 w-3" aria-hidden />
                          {s.price}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                          Price on consultation
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {clinic.settings.bookingEnabled && (
                  <Button
                    className="mt-3 h-10 w-full rounded-xl font-semibold"
                    onClick={() => {
                      track("BOOKING_STARTED");
                      push({ name: "booking" });
                    }}
                  >
                    Book
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Phone className="h-3 w-3" aria-hidden />
          Service details and prices are managed by the clinic.
        </p>
      </div>
    </div>
  );
}
