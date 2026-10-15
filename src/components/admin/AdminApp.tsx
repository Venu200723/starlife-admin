"use client";

// Admin app: session gate + responsive dashboard layout with section nav.
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, clearStoredToken } from "@/lib/client/api";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";
import { AdminAppointments } from "./AdminAppointments";
import { AdminCalendar } from "./AdminCalendar";
import { AdminServices } from "./AdminServices";
import { AdminPatients } from "./AdminPatients";
import { AdminSettings } from "./AdminSettings";
import { cn } from "@/lib/utils";

type Section = "dashboard" | "appointments" | "calendar" | "services" | "patients" | "settings";

const NAV: { key: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "appointments", label: "Appointments", icon: CalendarDays },
  { key: "calendar", label: "Calendar", icon: CalendarRange },
  { key: "services", label: "Services", icon: ClipboardList },
  { key: "patients", label: "Patients", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
];

export function AdminApp() {
  const [session, setSession] = useState<{ username: string; role: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const check = useCallback(async () => {
    const res = await apiFetch<{ username: string; role: string }>("/api/admin/me");
    setSession(res.ok ? (res.data ?? null) : null);
    setChecking(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void check(), 0);
    return () => clearTimeout(t);
  }, [check]);

  const signOut = async () => {
    await apiFetch("/api/admin/logout", { method: "POST" });
    clearStoredToken("admin");
    setSession(null);
    setSection("dashboard");
    toast({ title: "Signed out", description: "Admin session ended." });
  };

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 p-6" aria-busy="true">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!session) return <AdminLogin onSuccess={(s) => setSession(s)} />;

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 border-b px-5 py-4">
          <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white">
            ✚
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">STAR LIFE CLINIC</p>
            <p className="text-[11px] text-muted-foreground">Staff Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Admin sections">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              aria-current={section === key ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                section === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4.5 w-4.5" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="px-3 pb-2 text-xs text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{session.username}</span> ({session.role})
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => void signOut()}>
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Exit
            </Button>
          </div>
        </div>
      </aside>

      {/* Top bar + horizontal nav (mobile) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white">
              ✚
            </div>
            <p className="text-sm font-bold">STAR LIFE CLINIC · Staff</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Refresh data" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 lg:hidden" aria-label="Admin sections">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              aria-current={section === key ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
                section === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4 lg:p-6">
          {section === "dashboard" && <AdminDashboard refreshKey={refreshKey} />}
          {section === "appointments" && <AdminAppointments refreshKey={refreshKey} />}
          {section === "calendar" && <AdminCalendar refreshKey={refreshKey} />}
          {section === "services" && <AdminServices refreshKey={refreshKey} />}
          {section === "patients" && <AdminPatients refreshKey={refreshKey} />}
          {section === "settings" && <AdminSettings refreshKey={refreshKey} />}
        </main>
      </div>
    </div>
  );
}
