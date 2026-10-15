"use client";

// Bottom navigation: Home · Appointments · Clinic · Profile
import { House, CalendarDays, Stethoscope, UserRound } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import type { TabKey } from "@/types";
import { cn } from "@/lib/utils";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "home", label: "Home", icon: House },
  { key: "appointments", label: "Appointments", icon: CalendarDays },
  { key: "clinic", label: "Clinic", icon: Stethoscope },
  { key: "profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);

  return (
    <nav
      className="safe-bottom z-20 shrink-0 border-t bg-card/95 backdrop-blur"
      aria-label="Main navigation"
    >
      <div role="tablist" aria-label="App sections" className="grid grid-cols-4">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              aria-label={label}
              onClick={() => setTab(key)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" aria-hidden />
                )}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
