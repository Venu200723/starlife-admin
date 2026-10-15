// Calendar (.ics) generation for "Add to Calendar".
import { CLINIC_UTC_OFFSET } from "./time";

function toUtcStamp(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}:00${CLINIC_UTC_OFFSET}`);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface IcsInput {
  uid: string;
  title: string;
  description: string;
  location: string;
  url?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export function buildIcs(input: IcsInput): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//STAR LIFE CLINIC//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${esc(input.uid)}@starlifeclinic`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toUtcStamp(input.date, input.startTime)}`,
    `DTEND:${toUtcStamp(input.date, input.endTime)}`,
    `SUMMARY:${esc(input.title)}`,
    `DESCRIPTION:${esc(input.description)}`,
    `LOCATION:${esc(input.location)}`,
    input.url ? `URL:${esc(input.url)}` : "",
    `STATUS:${input.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Appointment reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.filter(Boolean).join("\r\n");
}
