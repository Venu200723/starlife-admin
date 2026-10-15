// Clinic-local time utilities — the clinic operates in Asia/Kolkata (IST, UTC+05:30, no DST).
export const CLINIC_TZ = "Asia/Kolkata";
export const CLINIC_UTC_OFFSET = "+05:30";

export interface ZonedNow {
  /** YYYY-MM-DD in clinic timezone */
  dateStr: string;
  /** HH:MM in clinic timezone */
  timeStr: string;
  /** minutes since midnight, clinic-local */
  minutes: number;
  /** 0 = Sunday ... 6 = Saturday, clinic-local */
  weekday: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Current date/time broken into clinic-local parts. */
export function getZonedNow(tz: string = CLINIC_TZ, at: Date = new Date()): ZonedNow {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const timeStr = `${hour}:${get("minute")}`;
  const minutes = Number(hour) * 60 + Number(get("minute"));
  return {
    dateStr,
    timeStr,
    minutes,
    weekday: WEEKDAY_MAP[get("weekday")] ?? 0,
  };
}

/** "HH:MM" -> minutes since midnight. Returns NaN for invalid input. */
export function timeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return NaN;
  return h * 60 + min;
}

/** minutes since midnight -> "HH:MM" (24h) */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "16:00" -> "4:00 PM" (12h display format) */
export function formatTime12h(time: string): string {
  const mins = timeToMinutes(time);
  if (Number.isNaN(mins)) return time;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Weekday index (0=Sun..6=Sat) for a clinic-local date string. */
export function weekdayOfDate(dateStr: string): number {
  // Noon in clinic tz avoids any date-line edge; convert to UTC and read day.
  const d = new Date(`${dateStr}T12:00:00${CLINIC_UTC_OFFSET}`);
  return d.getUTCDay();
}

/** Add N days to a YYYY-MM-DD string (calendar arithmetic, UTC-safe). */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Compare two YYYY-MM-DD strings. -1, 0, 1 */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Epoch ms for a clinic-local date + HH:MM (Kolkata is fixed-offset, no DST). */
export function clinicLocalToEpoch(dateStr: string, timeStr: string): number {
  return new Date(`${dateStr}T${timeStr}:00${CLINIC_UTC_OFFSET}`).getTime();
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-09-12" -> "12 September 2026" */
export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-09-12" -> "Sat, 12 Sep 2026" */
export function formatDateMedium(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = DAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd}, ${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "2026-09-12" -> { day: 12, weekdayShort: "Sat", monthShort: "Sep" } */
export function dateParts(dateStr: string): { day: number; weekdayShort: string; monthShort: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return {
    day: d,
    weekdayShort: DAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
    monthShort: MONTHS[m - 1].slice(0, 3),
  };
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
