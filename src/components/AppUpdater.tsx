import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { APP_NAME } from "../lib/brand";
import { openExternal } from "../lib/openUrl";
import { checkForUpdates, isNative, markBundleReady, type UpdateResult } from "../lib/otaUpdater";

const MIN_INTERVAL_MS = 30 * 60 * 1000;
const STARTUP_DELAY_MS = 4000;
const DISMISSED_KEY = "ironward.dismissedApk";

// Runs only inside the installed app. Web-code updates are silent:
// downloaded in the background, used from the next launch. A new APK
// can't be silent (Android asks the person to confirm installing it), so
// it's offered as a download.
export function AppUpdater() {
  const [offer, setOffer] = useState<Extract<UpdateResult, { kind: "native" }> | null>(null);
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!isNative()) return;
    let active = true;
    void markBundleReady();

    async function run() {
      const now = Date.now();
      if (now - lastCheck.current < MIN_INTERVAL_MS || navigator.onLine === false) return;
      lastCheck.current = now;
      const result = await checkForUpdates();
      if (!active || result.kind !== "native") return;
      const dismissed = Number(localStorage.getItem(DISMISSED_KEY)) || 0;
      if (result.required || result.versionCode > dismissed) setOffer(result);
    }

    const startup = window.setTimeout(() => void run(), STARTUP_DELAY_MS);
    let remove: (() => void) | undefined;
    void CapacitorApp.addListener("appStateChange", (s) => s.isActive && void run()).then((l) => {
      if (active) remove = () => void l.remove();
      else void l.remove();
    });
    return () => {
      active = false;
      window.clearTimeout(startup);
      remove?.();
    };
  }, []);

  if (!offer) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] px-4" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }} role="status">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xl">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">New {APP_NAME} {offer.versionName}</p>
          <p className="text-xs text-muted-foreground">{offer.required ? "Needed for the latest features." : "Your workouts stay as they are."}</p>
        </div>
        {!offer.required && (
          <button
            className="text-xs font-semibold text-muted-foreground"
            onClick={() => {
              localStorage.setItem(DISMISSED_KEY, String(offer.versionCode));
              setOffer(null);
            }}
          >
            Later
          </button>
        )}
        <button className="btn-primary !rounded-full !px-4 !py-2" onClick={() => openExternal(offer.apkUrl)}>
          Update
        </button>
      </div>
    </div>
  );
}
