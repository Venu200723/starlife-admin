// Pure appointment slot availability engine (no DB access — fully testable).
// Availability = clinic hours + blocked dates + blocked slots + existing
// appointments + service duration, all combined per the spec.
import { timeToMinutes, minutesToTime, weekdayOfDate } from "./time";
import type { DayHours } from "./clinic-status";

export interface ExistingAppointment {
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface BlockedSlotRange {
  date: string;
  startTime: string;
  endTime: string;
}

export interface Slot {
  start: string; // HH:MM
  end: string; // HH:MM
  available: boolean;
}

export interface SlotGenerationInput {
  date: string; // YYYY-MM-DD (clinic-local)
  hours: DayHours | null; // hours for that weekday
  blockedDates: { date: string }[];
  blockedSlots: BlockedSlotRange[];
  /** Only PENDING/CONFIRMED appointments should be passed in. */
  appointments: ExistingAppointment[];
  serviceDurationMinutes: number;
  slotStepMinutes: number;
  /** Clinic-local "now"; when the requested date is today, slots starting
   *  before now + minLeadMinutes are hidden. Null in tests. */
  now?: { dateStr: string; minutes: number } | null;
  minLeadMinutes?: number;
}

export interface SlotGenerationResult {
  slots: Slot[];
  closed: boolean;
  closedReason: "CLOSED_DAY" | "BLOCKED_DATE" | null;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Generate the full grid of bookable slots for a date and mark availability.
 * Slots are generated on a fixed grid (slotStepMinutes) measured from opening
 * time; each slot lasts the service duration.
 */
export function generateSlots(input: SlotGenerationInput): SlotGenerationResult {
  const {
    date,
    hours,
    blockedDates,
    blockedSlots,
    appointments,
    serviceDurationMinutes,
    slotStepMinutes,
    now = null,
    minLeadMinutes = 0,
  } = input;

  if (!hours || !hours.isOpen) {
    return { slots: [], closed: true, closedReason: "CLOSED_DAY" };
  }
  if (blockedDates.some((b) => b.date === date)) {
    return { slots: [], closed: true, closedReason: "BLOCKED_DATE" };
  }
  if (serviceDurationMinutes <= 0 || slotStepMinutes <= 0) {
    return { slots: [], closed: true, closedReason: null };
  }

  const openM = timeToMinutes(hours.openingTime);
  const closeM = timeToMinutes(hours.closingTime);
  if (Number.isNaN(openM) || Number.isNaN(closeM) || closeM <= openM) {
    return { slots: [], closed: true, closedReason: null };
  }

  const blockedRanges = blockedSlots
    .filter((b) => b.date === date)
    .map((b) => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) }))
    .filter((r) => !Number.isNaN(r.start) && !Number.isNaN(r.end) && r.end > r.start);

  const bookedRanges = appointments
    .filter((a) => a.appointmentDate === date && ["PENDING", "CONFIRMED"].includes(a.status))
    .map((a) => ({ start: timeToMinutes(a.startTime), end: timeToMinutes(a.endTime) }))
    .filter((r) => !Number.isNaN(r.start) && !Number.isNaN(r.end) && r.end > r.start);

  const isToday = !!now && now.dateStr === date;
  const earliest = isToday ? now.minutes + minLeadMinutes : -1;

  const slots: Slot[] = [];
  for (let t = openM; t + serviceDurationMinutes <= closeM; t += slotStepMinutes) {
    const end = t + serviceDurationMinutes;
    const conflictBlocked = blockedRanges.some((r) => overlaps(t, end, r.start, r.end));
    const conflictBooked = bookedRanges.some((r) => overlaps(t, end, r.start, r.end));
    const tooSoon = isToday && t < earliest;
    slots.push({
      start: minutesToTime(t),
      end: minutesToTime(end),
      available: !conflictBlocked && !conflictBooked && !tooSoon,
    });
  }
  return { slots, closed: false, closedReason: null };
}

/** Weekday convenience wrapper for generateSlots callers. */
export function weekdayFor(dateStr: string): number {
  return weekdayOfDate(dateStr);
}
