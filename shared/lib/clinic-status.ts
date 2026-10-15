// Pure clinic open/closed status engine (no DB access — fully testable).
import { DAY_NAMES, timeToMinutes, type ZonedNow } from "./time";

export interface DayHours {
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
}

export interface NextOpening {
  date: string;
  time: string; // HH:MM
  dayLabel: string; // "Today" | "Tomorrow" | "Saturday, 19 September"
  timeLabel: string; // "4:00 PM"
}

export interface ClinicStatus {
  isOpen: boolean;
  /** Short human label e.g. "Open now · Closes 9:30 PM" or "Closed · Opens Monday 4:00 PM" */
  message: string;
  todayHours: DayHours | null;
  nextOpening: NextOpening | null;
}

function fmt12(time: string): string {
  const mins = timeToMinutes(time);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Compute live open/closed status from configured hours.
 * `now` is injected so the function is deterministic and testable.
 * `dateFor` returns the clinic-local date string for "today + n days".
 */
export function computeClinicStatus(
  hours: DayHours[],
  now: ZonedNow,
  addDaysFn: (dateStr: string, days: number) => string,
): ClinicStatus {
  const byDay = new Map<number, DayHours>();
  for (const h of hours) byDay.set(h.dayOfWeek, h);

  const today = byDay.get(now.weekday) ?? null;
  const nowMinutes = now.minutes;

  const isOpenToday =
    !!today &&
    today.isOpen &&
    nowMinutes >= timeToMinutes(today.openingTime) &&
    nowMinutes < timeToMinutes(today.closingTime);

  let nextOpening: NextOpening | null = null;

  if (!isOpenToday) {
    if (today && today.isOpen && nowMinutes < timeToMinutes(today.openingTime)) {
      nextOpening = {
        date: now.dateStr,
        time: today.openingTime,
        dayLabel: "Today",
        timeLabel: fmt12(today.openingTime),
      };
    } else {
      for (let i = 1; i <= 7 && !nextOpening; i++) {
        const date = addDaysFn(now.dateStr, i);
        const wd = (now.weekday + i) % 7;
        const h = byDay.get(wd);
        if (h && h.isOpen) {
          nextOpening = {
            date,
            time: h.openingTime,
            dayLabel: i === 1 ? "Tomorrow" : `${DAY_NAMES[wd]}`,
            timeLabel: fmt12(h.openingTime),
          };
        }
      }
    }
  }

  let message: string;
  if (isOpenToday && today) {
    message = `Open now · Closes ${fmt12(today.closingTime)}`;
  } else if (nextOpening) {
    message = `Closed · Opens ${nextOpening.dayLabel === "Today" ? "today" : nextOpening.dayLabel} at ${nextOpening.timeLabel}`;
  } else {
    message = "Closed";
  }

  return { isOpen: isOpenToday, message, todayHours: today, nextOpening };
}
