import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

// "Rest is over" even when the phone is locked or the app is in the
// background. Natively the OS fires a scheduled notification; on the web
// the page fires one itself, which works while the tab is alive.

const ID = 7001;
let webTimer: number | null = null;
let asked = false;

async function ensurePermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    if (asked) return false;
    asked = true;
    return (await LocalNotifications.requestPermissions()).display === "granted";
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied" || asked) return false;
  asked = true;
  return (await Notification.requestPermission()) === "granted";
}

async function webNotify() {
  // Only when they're not looking; on screen the timer bar does the job.
  if (!document.hidden) return;
  const options = { body: "Time for your next set 💪", tag: "rest", icon: "/pwa-192x192.png" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification("Rest's over", options);
    else new Notification("Rest's over", options);
  } catch {
    // Notifications unavailable; the in-page beep still plays.
  }
}

export async function scheduleRestAlert(endsAt: number): Promise<void> {
  await cancelRestAlert();
  try {
    if (!(await ensurePermission())) return;
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [{ id: ID, title: "Rest's over", body: "Time for your next set 💪", schedule: { at: new Date(endsAt), allowWhileIdle: true } }],
      });
    } else {
      webTimer = window.setTimeout(() => void webNotify(), Math.max(0, endsAt - Date.now()));
    }
  } catch {
    // A missing permission or plugin just means no background alert.
  }
}

export async function cancelRestAlert(): Promise<void> {
  if (webTimer !== null) {
    window.clearTimeout(webTimer);
    webTimer = null;
  }
  if (Capacitor.isNativePlatform()) await LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => {});
}
