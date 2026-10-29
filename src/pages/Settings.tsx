import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/AppShell";
import { APP_NAME } from "../lib/brand";
import { APP_VERSION, BUILD_TIME } from "../lib/buildInfo";
import { applyStagedUpdate, getUpdaterDiagnostics, installedNativeBuild, isNative, type UpdateResult, type UpdaterDiagnostics } from "../lib/otaUpdater";
import { runUpdateCheck } from "../lib/updateFlow";
import { useBackend, useRequiredBackend } from "../context/BackendProvider";
import { useConfirm } from "../components/ConfirmDialog";
import { startGoogleSignIn } from "../lib/backend/googleAuth";
import type { ImportData } from "../lib/backend/types";
import { useTheme, type Theme } from "../context/ThemeProvider";
import { useBodyWeights, useLogs, useWorkouts } from "../hooks/useData";
import { exportBackup, exportCsv, parseBackup } from "../lib/exportData";
import { loadRestSeconds, loadStepKg, REST_CHOICES, restTimerEnabled, saveRestSeconds, saveStepKg, setRestTimerEnabled } from "../lib/local";
import { getUnit, setUnit, type Unit } from "../lib/units";
import { ReminderSettings } from "../components/ReminderSettings";
import { useActiveProgram } from "../hooks/useData";

export function Settings() {
  const confirm = useConfirm();
  const { ownerLabel, mode, accountsEnabled, guestBackend, signOut, deleteAccount } = useBackend();
  const backend = useRequiredBackend();
  const { theme, setTheme } = useTheme();
  const { data: workouts = [] } = useWorkouts();
  const { data: weights = [] } = useBodyWeights();
  const { data: logs = [] } = useLogs();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { program, plans } = useActiveProgram();
  const [rest, setRest] = useState(restTimerEnabled());
  const [restSeconds, setRestSeconds] = useState(loadRestSeconds());
  const [unit, setUnitState] = useState<Unit>(getUnit());
  const [stepKg, setStepKg] = useState(loadStepKg());
  // Smallest jumps on offer, in the unit shown (stored as kg).
  const steps = unit === "kg" ? [1, 1.25, 2, 2.5, 5].map((v) => ({ label: `${v} kg`, kg: v })) : [2.5, 5, 10].map((v) => ({ label: `${v} lb`, kg: Math.round(v * 0.45359237 * 1000) / 1000 }));
  const migrationFailed = Boolean((useLocation().state as { migrationFailed?: boolean } | null)?.migrationFailed);
  const [message, setMessage] = useState<string | null>(
    migrationFailed ? "Signed in, but your workouts on this device couldn't be moved to Drive yet. They're safe here — tap the button below to try again." : null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  // Adds rows (same ids replace, so importing twice doesn't duplicate).
  async function importRows(source: ImportData) {
    await backend.importAll(source);
    await qc.invalidateQueries();
    setMessage(`Imported ${source.workouts?.length ?? 0} workouts and ${source.bodyweights?.length ?? 0} weigh-ins.`);
  }

  async function restore(file: File) {
    try {
      await importRows(parseBackup(await file.text()));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  // Normally done automatically right after signing in; this is the retry
  // for when that couldn't finish.
  async function moveGuestData() {
    try {
      const guest = await guestBackend.exportAll();
      if (!guest.workouts.length && !guest.bodyweights.length && !guest.plans.length && !guest.logs.length) return setMessage("Nothing left on this device to move.");
      await importRows(guest);
      await guestBackend.deleteAccount();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't move them. Check your connection and try again.");
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Settings" />

      <Section title="Your plan">
        <Link to="/plans" className="flex items-center justify-between">
          <span>
            <span className="font-display block text-lg font-black">{program.name}</span>
            <span className="block text-xs text-muted-foreground">Switch, edit, build your own, or get one from AI</span>
          </span>
          <span className="text-muted-foreground">→</span>
        </Link>
        <Link to="/guide" className="mt-3 block text-sm font-semibold text-primary">
          How to train on a plan →
        </Link>
      </Section>

      <Section title="Units & weights">
        <div className="flex items-center justify-between">
          <span className="font-medium">Units</span>
          <div className="flex rounded-full bg-muted p-0.5 text-xs font-bold">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => {
                  setUnit(u);
                  setUnitState(u);
                  const def = u === "kg" ? 2.5 : Math.round(5 * 0.45359237 * 1000) / 1000;
                  saveStepKg(def);
                  setStepKg(def);
                }}
                className={`rounded-full px-4 py-1.5 ${unit === u ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 font-medium">Smallest weight jump</p>
        <p className="text-xs text-muted-foreground">What "go up in weight" suggests — match your gym's smallest plates or dumbbell steps.</p>
        <div className="mt-2 flex gap-1.5">
          {steps.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                saveStepKg(s.kg);
                setStepKg(s.kg);
              }}
              className={`flex-1 rounded-full py-2 text-xs font-bold ${Math.abs(stepKg - s.kg) < 0.01 ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Reminders">
        <ReminderSettings />
      </Section>

      <Section title="Workout">
        <label className="flex items-center justify-between py-1">
          <span>
            <span className="block font-medium">Rest timer</span>
            <span className="block text-xs text-muted-foreground">Starts when you tick a set. Use −15 / +15 on the timer to adjust one rest.</span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--primary)]"
            checked={rest}
            onChange={(e) => {
              setRestTimerEnabled(e.target.checked);
              setRest(e.target.checked);
            }}
          />
        </label>
        {rest && (
          <div className="mt-3 flex gap-1.5">
            {REST_CHOICES.map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  saveRestSeconds(sec);
                  setRestSeconds(sec);
                }}
                className={`flex-1 rounded-full py-2 text-xs font-bold tabular-nums ${restSeconds === sec ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
              >
                {sec < 60 ? `${sec}s` : sec % 60 ? `${Math.floor(sec / 60)}m${sec % 60}` : `${sec / 60} min`}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-medium">Theme</span>
          <div className="flex rounded-lg bg-muted p-0.5 text-xs font-semibold">
            {(["system", "light", "dark"] as Theme[]).map((t) => (
              <button key={t} onClick={() => setTheme(t)} className={`rounded-md px-3 py-1.5 capitalize ${theme === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Your data">
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={() => exportCsv(workouts)} disabled={!workouts.length}>
            Export CSV
          </button>
          <button className="btn-ghost" onClick={() => exportBackup(workouts, weights, plans, logs)}>
            Backup file
          </button>
          <button className="btn-ghost col-span-2" onClick={() => fileRef.current?.click()}>
            Restore from backup
          </button>
          <Link to="/import" className="btn-ghost col-span-2">
            Import from Strong or Hevy
          </Link>
          {mode === "account" && migrationFailed && (
            <button className="btn-primary col-span-2" onClick={moveGuestData}>
              Move this device's workouts to Drive
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        {message && <p className="mt-3 text-sm text-primary">{message}</p>}
      </Section>

      <AboutSection />

      <Section title="Account">
        <p className="text-sm">
          Signed in as <b>{ownerLabel}</b>
        </p>
        {mode === "guest" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Your logs live only on this device{accountsEnabled ? " — sign in with Google to keep them safe in your Drive and use them on other devices." : ". Download a backup file now and then."}
          </p>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {mode === "guest" && accountsEnabled && (
            <button className="btn-primary" onClick={() => void startGoogleSignIn().catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Google sign-in failed."))}>
              Sign in with Google
            </button>
          )}
          {mode === "account" && (
            <button
              className="btn-ghost"
              onClick={async () => {
                const ok = await confirm({
                  title: "Sign out?",
                  message: "Your workouts stay safe in your Google Drive. Sign in again any time to pick up where you left off.",
                  confirmLabel: "Sign out",
                });
                if (ok) await signOut().then(() => navigate("/login"));
              }}
            >
              Sign out
            </button>
          )}
          <button
            className="btn-danger"
            onClick={async () => {
              const ok = await confirm(
                mode === "guest"
                  ? { title: "Erase all data?", message: "Every workout, plan and log on this device will be deleted. This can't be undone.", confirmLabel: "Erase everything", tone: "danger" }
                  : { title: "Delete your data?", message: "Your Ironward folder moves to the Google Drive trash (recoverable there for 30 days), and Ironward's access to your Google account is removed.", confirmLabel: "Delete my data", tone: "danger" },
              );
              if (!ok) return;
              await deleteAccount();
              navigate("/login");
            }}
          >
            {mode === "guest" ? "Erase all data" : "Delete my data"}
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <p className="label mb-3">{title}</p>
      {children}
    </section>
  );
}

// Version, and inside the app: check for updates, switch to a downloaded
// one straight away, and what the updater is doing (ported from Waypoint).
function AboutSection() {
  const native = isNative();
  const [nativeBuild, setNativeBuild] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [details, setDetails] = useState<UpdaterDiagnostics | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (native) void installedNativeBuild().then(setNativeBuild);
  }, [native]);

  useEffect(() => {
    if (native && showDetails) void getUpdaterDiagnostics().then(setDetails).catch(() => undefined);
  }, [native, showDetails, result]);

  async function apply(bundleId: string) {
    setApplying(true);
    setApplyError(null);
    try {
      await applyStagedUpdate(bundleId);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Couldn't switch to the new version.");
      setApplying(false);
    }
  }

  async function check() {
    setChecking(true);
    try {
      setResult(await runUpdateCheck({ manual: true }));
    } finally {
      setChecking(false);
    }
  }

  const message = !result
    ? null
    : result.kind === "up-to-date"
      ? "You're on the latest version."
      : result.kind === "bundle-ready"
        ? `Version ${result.version} is downloaded and ready.`
        : result.kind === "native"
          ? result.sha256
            ? `A new app version (${result.versionName}) is available. It's downloading now — follow the progress at the top of the screen.`
            : `A new app version (${result.versionName}) is needed. Use the Update button at the top of the screen.`
          : result.kind === "error"
            ? `Couldn't check: ${result.message}`
            : result.kind === "unsupported"
              ? "This build can't check for updates."
              : null;

  return (
    <Section title="About">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>
          {APP_NAME} <span className="text-muted-foreground">v{APP_VERSION}</span>
          <span className="block text-xs text-muted-foreground">
            Built {new Date(BUILD_TIME).toLocaleDateString()}
            {native && nativeBuild ? ` · app build ${nativeBuild}` : ""}
          </span>
        </span>
        {native ? (
          <button className="btn-ghost shrink-0 !px-3 !py-2 text-sm" onClick={check} disabled={checking}>
            {checking ? "Checking…" : "Check for updates"}
          </button>
        ) : (
          <Link to="/download" className="shrink-0 font-bold text-primary">
            Install on phone →
          </Link>
        )}
      </div>
      {!native && <p className="mt-2 text-xs text-muted-foreground">The website updates itself.</p>}
      {message && <p className={`mt-3 text-sm ${result?.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}
      {result?.kind === "bundle-ready" && (
        <div className="mt-3">
          <button className="btn-primary !px-4 !py-2" disabled={applying} onClick={() => void apply(result.bundleId)}>
            {applying ? "Restarting…" : "Restart now to use it"}
          </button>
          <p className="mt-1.5 text-xs text-muted-foreground">Or leave it: it switches by itself the next time you leave the app.</p>
          {applyError && <p className="mt-1.5 text-xs text-destructive">{applyError}</p>}
        </div>
      )}
      {native && (
        <div className="mt-3">
          <button className="text-xs text-muted-foreground underline underline-offset-2" onClick={() => setShowDetails((v) => !v)}>
            {showDetails ? "Hide update details" : "Update details"}
          </button>
          {showDetails && details && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border border-border px-3 py-2 text-xs">
              <dt className="text-muted-foreground">Running build</dt>
              <dd className="font-mono">{new Date(details.runningBuildTime).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Bundle</dt>
              <dd className="break-all font-mono">
                {details.currentBundleId} ({details.currentBundleVersion})
              </dd>
              <dt className="text-muted-foreground">Waiting</dt>
              <dd className="break-all font-mono">{details.nextBundleId ?? "none"}</dd>
              <dt className="text-muted-foreground">Downloaded</dt>
              <dd className="font-mono">{details.bundles.length === 0 ? "none" : details.bundles.map((b) => `${b.version} ${b.status}`).join(", ")}</dd>
              <dt className="text-muted-foreground">App build</dt>
              <dd className="font-mono">{details.nativeBuild}</dd>
              {details.problem && (
                <>
                  <dt className="text-destructive">Problem</dt>
                  <dd className="text-destructive">{details.problem}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      )}
    </Section>
  );
}
