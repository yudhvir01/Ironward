import { useEffect, useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { APP_NAME } from "../lib/brand";

const APK_URL = "/downloads/ironward.apk";

// Android (install from the browser, or the APK) and iPhone (Add to Home
// Screen) side by side — shared by the landing page and /download.
export function InstallOptions() {
  const install = useInstallPrompt();
  const [apk, setApk] = useState<{ version: string | null } | null>(null);

  // Only offer the APK when the site actually serves one, and say which
  // version it is (from the update manifest).
  useEffect(() => {
    fetch(APK_URL, { method: "HEAD" })
      .then(async (res) => {
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("android")) return;
        const manifest = await fetch("/updates/latest.json")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        setApk({ version: manifest?.apk?.versionName ?? null });
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card flex flex-col p-6">
        <p className="font-display text-2xl font-black">Android</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Install straight from your browser: nothing to download, no security prompt, and it keeps itself up to date.
        </p>
        <div className="mt-5">
          {!install.available ? (
            <span className="btn-ghost w-full">You're in the app already 💪</span>
          ) : install.installed ? (
            <span className="btn-ghost w-full">Installed — find {APP_NAME} on your home screen</span>
          ) : install.canPrompt ? (
            <button className="btn-primary w-full py-3.5" onClick={() => void install.install()}>
              Install {APP_NAME}
            </button>
          ) : (
            <span className="btn-ghost w-full text-muted-foreground">In Chrome: ⋮ menu → Install app</span>
          )}
        </div>
        {apk && (
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">
              Prefer a regular app file{apk.version ? ` (v${apk.version})` : ""}? It adds lock-screen rest alerts and updates itself.
            </p>
            <a href={APK_URL} download={`${APP_NAME}.apk`} className="btn-ghost mt-3 w-full">
              Download the APK
            </a>
          </div>
        )}
      </div>
      <div className="card flex flex-col p-6">
        <p className="font-display text-2xl font-black">iPhone &amp; iPad</p>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">
          Apple only allows installs through its own store, so add {APP_NAME} from Safari instead — it opens full-screen like any other app.
        </p>
        <ol className="mt-4 space-y-1.5 text-sm">
          <li>1. Open this page in <b>Safari</b></li>
          <li>2. Tap <b>Share</b> (square with an arrow)</li>
          <li>3. Tap <b>Add to Home Screen</b></li>
        </ol>
      </div>
    </div>
  );
}
