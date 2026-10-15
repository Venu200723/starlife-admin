"use client";

// In-app notification center.
import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarPlus, CheckCheck, RefreshCw, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/app-store";
import { ScreenHeader } from "../shared";
import { SignInPrompt } from "./SignInPrompt";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/types";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  BOOKING: CalendarPlus,
  STATUS: CheckCheck,
  REMINDER: Bell,
  SCHEDULE: Megaphone,
  GENERAL: Bell,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationsScreen() {
  const patient = useAppStore((s) => s.patient);
  const setPatient = useAppStore((s) => s.setPatient);
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ items: NotificationItem[]; unread: number }>("/api/patient/notifications");
    if (res.ok && res.data) setItems(res.data.items);
    else setItems([]);
  }, []);

  useEffect(() => {
    if (!patient) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [patient, load]);

  const markAllRead = async () => {
    const res = await apiFetch<{ unread: number }>("/api/patient/notifications", {
      method: "POST",
      json: { all: true },
    });
    if (res.ok && patient) {
      setPatient({ ...patient, unreadNotifications: 0 });
      void load();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Notifications"
        action={
          items && items.length > 0 && items.some((n) => !n.read) ? (
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg text-xs font-semibold text-primary" onClick={() => void markAllRead()}>
              <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Mark all read
            </Button>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        {!patient ? (
          <SignInPrompt
            title="Sign in for notifications"
            body="Sign in with your email and password to receive appointment updates and reminders here."
          />
        ) : items === null ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-sm ring-1 ring-border/60">
            <Bell className="h-8 w-8 text-muted-foreground/60" aria-hidden />
            <p className="mt-3 font-semibold">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Booking updates, confirmations and reminders will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <li
                  key={n.id}
                  className={cn(
                    "flex gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 transition",
                    n.read ? "ring-border/60" : "ring-primary/30 bg-secondary/30",
                  )}
                  aria-current={!n.read ? "true" : undefined}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">{timeAgo(n.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
