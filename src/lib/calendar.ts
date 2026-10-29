import { APP_NAME, APP_TAGLINE } from "./brand";
import { download } from "./exportData";
import type { ReminderSettings } from "./local";

// Training-day reminders for the website, where a page can't schedule
// notifications: a weekly repeating calendar event with an alert, which
// the phone's or computer's own calendar then delivers.

const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]; // 1 = Monday

const pad = (n: number) => String(n).padStart(2, "0");

function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// The next date (today included) that falls on one of the chosen days.
function firstOccurrence(r: ReminderSettings): Date {
  const d = new Date();
  d.setHours(r.hour, r.minute, 0, 0);
  for (let i = 0; i < 8; i++) {
    const day = ((d.getDay() + 6) % 7) + 1;
    if (r.days.includes(day) && d.getTime() > Date.now()) return d;
    d.setDate(d.getDate() + 1);
    d.setHours(r.hour, r.minute, 0, 0);
  }
  return d;
}

export function reminderIcs(r: ReminderSettings, siteUrl: string): string {
  const start = firstOccurrence(r);
  // Floating local time: the reminder stays at e.g. 18:00 wherever the
  // person is, which is what a gym habit wants.
  const local = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(r.hour)}${pad(r.minute)}00`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${APP_NAME}//Training reminders//EN`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${APP_NAME.toLowerCase()}-training-${Date.now()}@${new URL(siteUrl).hostname}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${local}`,
    "DURATION:PT1H",
    `RRULE:FREQ=WEEKLY;BYDAY=${[...r.days].sort().map((d) => BYDAY[d - 1]).join(",")}`,
    `SUMMARY:${APP_NAME} — training day 💪`,
    `DESCRIPTION:Your next session is ready in ${APP_NAME}. ${APP_TAGLINE}`,
    `URL:${siteUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT0M",
    `DESCRIPTION:${APP_NAME} — training day`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function addRemindersToCalendar(r: ReminderSettings) {
  download(`${APP_NAME.toLowerCase()}-training-days.ics`, "text/calendar", reminderIcs(r, window.location.origin));
}
