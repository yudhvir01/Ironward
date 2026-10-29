import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

// Links that leave the app: an in-app browser sheet natively, a new tab
// on the web.
export function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) void Browser.open({ url });
  else window.open(url, "_blank", "noopener");
}
