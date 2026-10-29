import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { APP_NAME } from "./brand";
import type { ReminderSettings } from "./local";

// Weekly "time to train" notifications, scheduled by the phone itself so
// they fire with the app closed. Phone app only: a website can't wake
// itself up on a schedule.

const BASE_ID = 8000;

export const remindersSupported = () => Capacitor.isNativePlatform();

export async function applyReminders(r: ReminderSettings): Promise<"ok" | "denied" | "unsupported"> {
  if (!remindersSupported()) return "unsupported";
  await LocalNotifications.cancel({ notifications: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ id: BASE_ID + d })) }).catch(() => {});
  if (!r.on || !r.days.length) return "ok";
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return "denied";
  await LocalNotifications.schedule({
    notifications: r.days.map((d) => ({
      id: BASE_ID + d,
      title: "Training day 💪",
      body: `Open ${APP_NAME} — your next session is ready.`,
      // Capacitor counts weekdays from Sunday = 1; ours start at Monday = 1.
      schedule: { on: { weekday: (d % 7) + 1, hour: r.hour, minute: r.minute }, allowWhileIdle: true },
    })),
  });
  return "ok";
}
