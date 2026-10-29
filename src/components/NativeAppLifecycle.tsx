import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";

const GOOGLE_CALLBACK_PATH = "/auth/google/callback";
let lastHandledUrl: string | null = null;

// Google's sign-in redirect comes back to the app as an Android App Link
// (https://<site>/auth/google/callback). This hands it to the router so the
// callback page can finish signing in inside the app (ported from Waypoint).
export function NativeAppLifecycle() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;

    function handleUrl(raw: string) {
      if (!active || raw === lastHandledUrl) return;
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        return;
      }
      if (url.pathname !== GOOGLE_CALLBACK_PATH) return;
      lastHandledUrl = raw;
      // Android's Custom Tab closes itself when the App Link brings the app
      // forward; iOS needs telling.
      void Browser.close().catch(() => undefined);
      navigate(`${url.pathname}${url.search}`, { replace: true });
    }

    let remove: (() => void) | undefined;
    void CapacitorApp.addListener("appUrlOpen", (e) => handleUrl(e.url)).then((l) => {
      if (active) remove = () => void l.remove();
      else void l.remove();
    });
    // appUrlOpen covers a running app; getLaunchUrl covers a cold start.
    void CapacitorApp.getLaunchUrl().then((launch) => launch?.url && handleUrl(launch.url));

    return () => {
      active = false;
      remove?.();
    };
  }, [navigate]);

  return null;
}
