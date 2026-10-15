"use client";

// Weekly clinic hours with live open/closed status (Asia/Kolkata).
import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/app-store";
import { ScreenHeader, ClinicStatusPill } from "../shared";
import { DAY_NAMES, formatTime12h } from "@/lib/time";
import { cn } from "@/lib/utils";

export function HoursScreen() {
  const clinic = useAppStore((s) => s.clinic);
  const loading = useAppStore((s) => s.clinicLoading);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Clinic Hours" subtitle="Timings in Asia/Kolkata (IST)" />
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        {loading && !clinic ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : clinic ? (
          <>
            <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Clock className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold">{clinic.status.message}</p>
                  {clinic.status.nextOpening && (
                    <p className="text-xs text-muted-foreground">
                      Next opening: {clinic.status.nextOpening.dayLabel} at {clinic.status.nextOpening.timeLabel}
                    </p>
                  )}
                </div>
              </div>
              <ClinicStatusPill isOpen={clinic.status.isOpen} />
            </div>

            <ul className="mt-3 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60" role="list">
              {DAY_NAMES.map((day, i) => {
                const h = clinic.hours.find((x) => x.dayOfWeek === i);
                const isToday = new Date().getDay() === i;
                return (
                  <li
                    key={day}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5",
                      i > 0 && "border-t",
                      isToday && "bg-secondary/50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm", isToday ? "font-bold text-secondary-foreground" : "font-medium")}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          TODAY
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm tabular",
                        h?.isOpen ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {h?.isOpen
                        ? `${formatTime12h(h.openingTime)} – ${formatTime12h(h.closingTime)}`
                        : "Closed"}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              Timings can change on public holidays or emergencies.
              <br />
              Last appointment is scheduled so it finishes by closing time.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
