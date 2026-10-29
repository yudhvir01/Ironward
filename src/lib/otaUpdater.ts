import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { decideUpdate, parseManifest, type UpdateManifest } from "./appUpdate";
import { BUILD_TIME } from "./buildInfo";
import { UPDATE_BASE_URL } from "./env";

// Everything here is a no-op in a browser: the website updates itself
// through its service worker. Only the installed app runs the bundle
// updater (ported from Waypoint).

export type UpdateResult =
  | { kind: "unsupported" }
  | { kind: "up-to-date" }
  // A newer bundle is downloaded and will be in use from the next launch.
  | { kind: "bundle-ready"; version: string }
  // A newer APK exists (or a newer bundle needs one).
  | { kind: "native"; apkUrl: string; versionName: string; versionCode: number; required: boolean }
  | { kind: "error"; message: string };

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// Must be called once the app has started. If it isn't, the plugin assumes
// the new bundle is broken and goes back to the previous one on its own.
export async function markBundleReady(): Promise<void> {
  if (!isNative()) return;
  await CapacitorUpdater.notifyAppReady().catch(() => undefined);
}

async function installedNativeBuild(): Promise<number> {
  try {
    return Number((await App.getInfo()).build) || 0;
  } catch {
    return 0;
  }
}

async function fetchManifest(base: string): Promise<UpdateManifest> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${base}/updates/latest.json?t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`Update check failed (${res.status}).`);
    const manifest = parseManifest(await res.json(), base);
    if (!manifest) throw new Error("The update information wasn't valid.");
    return manifest;
  } finally {
    window.clearTimeout(timer);
  }
}

// Old downloaded bundles pile up on the phone otherwise.
async function pruneBundles(keep: string[]): Promise<void> {
  try {
    const { bundles } = await CapacitorUpdater.list();
    for (const b of bundles) {
      if (b.id !== "builtin" && !keep.includes(b.id)) await CapacitorUpdater.delete({ id: b.id }).catch(() => undefined);
    }
  } catch {
    // Housekeeping only.
  }
}

async function downloadAndStage(manifest: UpdateManifest): Promise<void> {
  const version = String(manifest.builtAt);
  const { bundles } = await CapacitorUpdater.list();
  let bundle = bundles.find((b) => b.version === version && b.status !== "error");
  bundle ??= await CapacitorUpdater.download({ url: manifest.bundle.url, version, checksum: manifest.bundle.checksum });
  // "next" = used from the next launch; never reloads mid-workout.
  await CapacitorUpdater.next({ id: bundle.id });
  const current = await CapacitorUpdater.current();
  await pruneBundles([bundle.id, current.bundle.id]);
}

export async function checkForUpdates(): Promise<UpdateResult> {
  if (!isNative() || !UPDATE_BASE_URL) return { kind: "unsupported" };
  try {
    const manifest = await fetchManifest(UPDATE_BASE_URL);
    const decision = decideUpdate(manifest, { nativeBuild: await installedNativeBuild(), buildTime: BUILD_TIME });
    if (decision.bundle) {
      await downloadAndStage(decision.bundle);
      return { kind: "bundle-ready", version: manifest.version };
    }
    if (decision.native) {
      return {
        kind: "native",
        apkUrl: decision.native.url,
        versionName: decision.native.versionName,
        versionCode: decision.native.versionCode,
        required: decision.bundleNeedsNative,
      };
    }
    return { kind: "up-to-date" };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "Couldn't check for updates." };
  }
}
