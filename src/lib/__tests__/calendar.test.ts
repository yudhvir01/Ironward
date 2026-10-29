import { describe, expect, it } from "vitest";
import { reminderIcs } from "../calendar";

describe("training-day calendar file", () => {
  it("is a weekly repeating event on the chosen days, with an alert", () => {
    const ics = reminderIcs({ on: true, days: [5, 1, 3], hour: 18, minute: 30 }, "https://ironward.app");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\r\n");
    expect(ics).toMatch(/DTSTART:\d{8}T183000\r\n/);
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("SUMMARY:Ironward — training day 💪");
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
  });
});
