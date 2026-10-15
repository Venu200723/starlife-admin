// App settings with typed defaults (booking rules, feature flags).
import { db } from "./db";

export interface ClinicSettings {
  slotStepMinutes: number;
  maxAdvanceDays: number;
  cancellationCutoffHours: number;
  autoConfirm: boolean;
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
  bookingEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappNumber: string;
}

export const DEFAULT_SETTINGS: ClinicSettings = {
  slotStepMinutes: 30,
  maxAdvanceDays: 30,
  cancellationCutoffHours: 2,
  autoConfirm: false,
  notificationsEnabled: true,
  analyticsEnabled: true,
  bookingEnabled: true,
  whatsappEnabled: false,
  whatsappNumber: "",
};

const KEY_MAP: Record<keyof ClinicSettings, string> = {
  slotStepMinutes: "slot_step_minutes",
  maxAdvanceDays: "max_advance_days",
  cancellationCutoffHours: "cancellation_cutoff_hours",
  autoConfirm: "auto_confirm",
  notificationsEnabled: "notifications_enabled",
  analyticsEnabled: "analytics_enabled",
  bookingEnabled: "booking_enabled",
  whatsappEnabled: "whatsapp_enabled",
  whatsappNumber: "whatsapp_number",
};

export async function getSettings(): Promise<ClinicSettings> {
  const rows = await db.appSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const bool = (k: string, dflt: boolean) =>
    map.get(k) === undefined ? dflt : map.get(k) === "true";
  const num = (k: string, dflt: number) => {
    const v = Number(map.get(k));
    return Number.isFinite(v) && v > 0 ? v : dflt;
  };
  return {
    slotStepMinutes: num(KEY_MAP.slotStepMinutes, DEFAULT_SETTINGS.slotStepMinutes),
    maxAdvanceDays: num(KEY_MAP.maxAdvanceDays, DEFAULT_SETTINGS.maxAdvanceDays),
    cancellationCutoffHours: num(KEY_MAP.cancellationCutoffHours, DEFAULT_SETTINGS.cancellationCutoffHours),
    autoConfirm: bool(KEY_MAP.autoConfirm, DEFAULT_SETTINGS.autoConfirm),
    notificationsEnabled: bool(KEY_MAP.notificationsEnabled, DEFAULT_SETTINGS.notificationsEnabled),
    analyticsEnabled: bool(KEY_MAP.analyticsEnabled, DEFAULT_SETTINGS.analyticsEnabled),
    bookingEnabled: bool(KEY_MAP.bookingEnabled, DEFAULT_SETTINGS.bookingEnabled),
    whatsappEnabled: bool(KEY_MAP.whatsappEnabled, DEFAULT_SETTINGS.whatsappEnabled),
    whatsappNumber: map.get(KEY_MAP.whatsappNumber) ?? DEFAULT_SETTINGS.whatsappNumber,
  };
}

export async function saveSettings(patch: Record<string, string>) {
  const ops = Object.entries(patch).map(([key, value]) =>
    db.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } }),
  );
  await db.$transaction(ops);
}
