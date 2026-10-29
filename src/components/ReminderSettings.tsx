import { useState } from "react";
import { addRemindersToCalendar } from "../lib/calendar";
import { loadReminder, saveReminder, type ReminderSettings as R } from "../lib/local";
import { applyReminders, remindersSupported } from "../lib/reminders";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Pick training days and a time. The phone app turns them into
// notifications; the website adds them to your calendar instead, since a
// web page can't wake itself up on a schedule.
export function ReminderSettings() {
  const native = remindersSupported();
  const [r, setR] = useState<R>(() => ({ ...loadReminder(), on: native ? loadReminder().on : true }));
  const [status, setStatus] = useState<string | null>(null);

  async function update(next: R) {
    setR(next);
    saveReminder(next);
    if (!native) return;
    const result = await applyReminders(next);
    setStatus(result === "denied" ? "Notifications are off for this app — turn them on in your phone's settings." : null);
  }

  const time = `${String(r.hour).padStart(2, "0")}:${String(r.minute).padStart(2, "0")}`;
  const picker = (
    <div className="space-y-3">
      <div>
        <p className="label mb-1.5">Days</p>
        <div className="flex gap-1">
          {DAYS.map((d, i) => {
            const day = i + 1;
            const on = r.days.includes(day);
            return (
              <button
                key={i}
                onClick={() => void update({ ...r, days: on ? r.days.filter((x) => x !== day) : [...r.days, day].sort() })}
                aria-pressed={on}
                className={`h-10 flex-1 rounded-full text-sm font-bold ${on ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <label className="block">
        <span className="label">Time</span>
        <input
          type="time"
          className="field mt-1.5 !py-2.5"
          value={time}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            if (Number.isFinite(h) && Number.isFinite(m)) void update({ ...r, hour: h, minute: m });
          }}
        />
      </label>
    </div>
  );

  if (!native) {
    return (
      <div className="space-y-4">
        {picker}
        <button
          className="btn-ghost w-full border border-primary/50 text-primary"
          disabled={!r.days.length}
          onClick={() => {
            addRemindersToCalendar(r);
            setStatus("Open the downloaded file to add it — your calendar will remind you on those days.");
          }}
        >
          📅 Add to my calendar
        </button>
        {status && <p className="text-xs text-muted-foreground">{status}</p>}
        <p className="text-xs text-muted-foreground">In the phone app these come as notifications instead.</p>
      </div>
    );
  }

  return (
    <div>
      <label className="flex items-center justify-between py-1">
        <span className="font-medium">Training-day reminder</span>
        <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={r.on} onChange={(e) => void update({ ...r, on: e.target.checked })} />
      </label>
      {r.on && <div className="mt-3">{picker}</div>}
      {status && <p className="mt-2 text-xs text-warn">{status}</p>}
    </div>
  );
}
