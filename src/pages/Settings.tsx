import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/AppShell";
import { APP_NAME } from "../lib/brand";
import { APP_VERSION } from "../lib/buildInfo";
import { useBackend, useRequiredBackend } from "../context/BackendProvider";
import { useTheme, type Theme } from "../context/ThemeProvider";
import { useBodyWeights, useLogs, useWorkouts } from "../hooks/useData";
import { exportBackup, exportCsv, parseBackup } from "../lib/exportData";
import { loadRestSeconds, loadStepKg, REST_CHOICES, restTimerEnabled, saveRestSeconds, saveStepKg, setRestTimerEnabled } from "../lib/local";
import { getUnit, setUnit, type Unit } from "../lib/units";
import { ReminderSettings } from "../components/ReminderSettings";
import { useActiveProgram } from "../hooks/useData";

export function Settings() {
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
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Adds rows (same ids replace, so importing twice doesn't duplicate).
  async function importRows(source: { workouts: typeof workouts; bodyweights: typeof weights; plans?: typeof plans; logs?: typeof logs }) {
    for (const w of source.workouts) await backend.saveWorkout(w);
    for (const p of source.plans ?? []) await backend.savePlan(p);
    const haveLogs = new Set(logs.map((l) => `${l.day}:${l.kind}:${l.value}:${l.created_at}`));
    for (const l of source.logs ?? []) if (!haveLogs.has(`${l.day}:${l.kind}:${l.value}:${l.created_at}`)) await backend.addLog({ day: l.day, kind: l.kind, value: l.value });
    const existing = new Set(weights.map((w) => `${w.day}:${w.kg}`));
    for (const b of source.bodyweights) if (!existing.has(`${b.day}:${b.kg}`)) await backend.addBodyWeight({ day: b.day, kg: b.kg });
    await qc.invalidateQueries();
    setMessage(`Imported ${source.workouts.length} workouts and ${source.bodyweights.length} weigh-ins.`);
  }

  async function restore(file: File) {
    try {
      await importRows(parseBackup(await file.text()));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  async function moveGuestData() {
    const [gw, gb, gp, gl] = await Promise.all([guestBackend.listWorkouts(), guestBackend.listBodyWeights(), guestBackend.listPlans(), guestBackend.listLogs()]);
    if (!gw.length && !gb.length && !gp.length && !gl.length) return setMessage("There's nothing saved on this device without an account.");
    await importRows({ workouts: gw, bodyweights: gb, plans: gp, logs: gl });
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
          {mode === "account" && (
            <button className="btn-ghost col-span-2" onClick={moveGuestData}>
              Bring in workouts logged on this device without an account
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        {message && <p className="mt-3 text-sm text-primary">{message}</p>}
      </Section>

      <Section title="App">
        <div className="flex items-center justify-between text-sm">
          <span>
            {APP_NAME} <span className="text-muted-foreground">v{APP_VERSION}</span>
          </span>
          <Link to="/download" className="font-bold text-primary">
            Install on phone →
          </Link>
        </div>
      </Section>

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
            <button className="btn-primary" onClick={() => signOut().then(() => navigate("/login"))}>
              Sign in with Google
            </button>
          )}
          {mode === "account" && (
            <button className="btn-ghost" onClick={() => signOut().then(() => navigate("/login"))}>
              Sign out
            </button>
          )}
          <button
            className="btn-danger"
            onClick={async () => {
              if (!confirm(mode === "guest" ? "Erase every workout on this device?" : "Delete your Ironward data from your Google Drive? It moves to the Drive trash for 30 days.")) return;
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
