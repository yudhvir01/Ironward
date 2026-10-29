import { describe, expect, it, vi } from "vitest";
import { createApkUpdater, type ApkInstallerDeps, type ApkOffer } from "../apkUpdate";

const offer: ApkOffer = { apkUrl: "https://ironward.example/downloads/ironward.apk", versionName: "1.0", versionCode: 4, sha256: "a".repeat(64), required: false };

function fakeInstaller(over: Partial<ApkInstallerDeps> = {}) {
  const calls: string[] = [];
  const deps: ApkInstallerDeps = {
    available: () => true,
    canInstall: async () => true,
    openInstallSettings: async () => void calls.push("settings"),
    download: async () => ({ path: "/cache/updates/ironward-update.apk", versionCode: 4, installedVersionCode: 3 }),
    install: async () => void calls.push("install"),
    cancel: async () => void calls.push("cancel"),
    onProgress: async () => () => undefined,
    openInBrowser: async (url) => void calls.push(`browser ${url}`),
    ...over,
  };
  return { deps, calls };
}

describe("in-app APK update", () => {
  it("downloads and opens Android's installer on its own", async () => {
    const { deps, calls } = fakeInstaller();
    const u = createApkUpdater(deps);
    await u.offer(offer, { autoStart: true });
    expect(u.getState().phase).toBe("installing");
    expect(calls).toEqual(["install"]);
  });

  it("asks for the install permission first, then continues after Settings", async () => {
    let allowed = false;
    const { deps, calls } = fakeInstaller({ canInstall: async () => allowed });
    const u = createApkUpdater(deps);
    await u.offer(offer, { autoStart: true });
    expect(u.getState().phase).toBe("needs-permission");
    allowed = true;
    await u.resumeAfterSettings();
    expect(u.getState().phase).toBe("installing");
    expect(calls).toEqual(["install"]);
  });

  it("falls back to the browser without the plugin or a checksum", async () => {
    const { deps, calls } = fakeInstaller({ available: () => false });
    const u = createApkUpdater(deps);
    await u.offer(offer, { autoStart: true });
    expect(u.getState().phase).toBe("offered");
    await u.start();
    expect(calls).toEqual([`browser ${offer.apkUrl}`]);
  });

  it("reports a failed download and can try again", async () => {
    const download = vi.fn().mockRejectedValueOnce(new Error("The downloaded update did not match its checksum."));
    download.mockResolvedValueOnce({ path: "/p", versionCode: 4, installedVersionCode: 3 });
    const { deps } = fakeInstaller({ download });
    const u = createApkUpdater(deps);
    await u.offer(offer, { autoStart: true });
    expect(u.getState()).toMatchObject({ phase: "error", error: "The downloaded update did not match its checksum." });
    await u.start();
    expect(u.getState().phase).toBe("installing");
  });

  it("does nothing when the download isn't newer than what's installed", async () => {
    const { deps, calls } = fakeInstaller({ download: async () => ({ path: "/p", versionCode: 3, installedVersionCode: 3 }) });
    const u = createApkUpdater(deps);
    await u.offer(offer, { autoStart: true });
    expect(u.getState().phase).toBe("idle");
    expect(calls).toEqual([]);
  });

  it("goes back to the offer when cancelled mid-download", async () => {
    const { deps } = fakeInstaller({ download: async () => Promise.reject(new Error("cancelled")) });
    const u = createApkUpdater(deps);
    await u.offer(offer, { autoStart: true });
    expect(u.getState().phase).toBe("offered");
  });
});
