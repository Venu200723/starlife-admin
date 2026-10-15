"use client";

// Main app: tab screens + overlay screen stack + offline banner + bottom nav.
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { BottomNav } from "./BottomNav";
import { HomeScreen } from "./home/HomeScreen";
import { AppointmentsScreen } from "./appointments/AppointmentsScreen";
import { ClinicScreen } from "./clinic/ClinicScreen";
import { ProfileScreen } from "./profile/ProfileScreen";
import { OverlayLayer } from "./OverlayLayer";
import { cn } from "@/lib/utils";

export function MainApp() {
  const tab = useAppStore((s) => s.tab);
  const stack = useAppStore((s) => s.stack);
  const online = useAppStore((s) => s.online);
  const overlayOpen = stack.length > 0;

  return (
    <div className="flex h-full flex-col">
      {!online && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-xs font-medium text-warning"
        >
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          You are offline — showing cached clinic info. Booking needs internet.
        </div>
      )}

      <main className="relative flex-1 overflow-hidden">
        <div className={cn("h-full overflow-y-auto thin-scrollbar", overlayOpen && "invisible")} aria-hidden={overlayOpen}>
          {tab === "home" && <HomeScreen />}
          {tab === "appointments" && <AppointmentsScreen />}
          {tab === "clinic" && <ClinicScreen />}
          {tab === "profile" && <ProfileScreen />}
        </div>

        <AnimatePresence>
          {overlayOpen && (
            <motion.div
              key={stack.map((s) => s.name + (s.id ?? "")).join("|")}
              className="absolute inset-0 z-30 flex flex-col bg-background"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            >
              <OverlayLayer entry={stack[stack.length - 1]} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!overlayOpen && <BottomNav />}
    </div>
  );
}
