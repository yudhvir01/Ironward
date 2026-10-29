import { useConfirm } from "../components/ConfirmDialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { WarmupSection } from "../components/WarmupSection";
import { WorkoutEditor } from "../components/WorkoutEditor";
import { BackIcon } from "../components/Icons";
import { useSaveWorkout, useWorkouts } from "../hooks/useData";
import { restDoneFeedback } from "../lib/feedback";
import { loadDraft, loadExerciseRest, loadRest, loadRestSeconds, restTimerEnabled, saveDraft, saveExerciseRest, saveRest, saveWarmupTicks, type RestState } from "../lib/local";
import { cancelRestAlert, scheduleRestAlert } from "../lib/restAlert";
import { lastPerformance, workoutSetCount } from "../lib/stats";
import type { Workout } from "../lib/types";

export function WorkoutPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(() => loadDraft());
  const { data: history = [] } = useWorkouts();
  const save = useSaveWorkout();
  const [rest, setRestState] = useState<RestState | null>(() => loadRest());

  // Stable, because the rest timer's auto-dismiss effect depends on it.
  const setRest = useCallback((next: RestState | null) => {
    setRestState(next);
    saveRest(next);
    if (next) void scheduleRestAlert(next.endsAt);
    else void cancelRestAlert();
  }, []);

  // ±15 on a rest also becomes that exercise's rest from now on.
  const adjustRest = useCallback(
    (by: number) => {
      setRestState((r) => {
        if (!r) return r;
        const endsAt = Math.max(Date.now() + 1000, r.endsAt + by * 1000);
        const next = { ...r, endsAt };
        saveRest(next);
        void scheduleRestAlert(endsAt);
        if (r.exerciseId) saveExerciseRest(r.exerciseId, Math.max(15, Math.round((endsAt - r.startedAt) / 15000) * 15));
        return next;
      });
    },
    [],
  );
  const [error, setError] = useState<string | null>(null);

  if (!workout) return <Navigate to="/" replace />;

  function change(next: Workout) {
    setWorkout(next);
    saveDraft(next);
  }

  async function finish() {
    if (!workout) return;
    if (workoutSetCount(workout) === 0) {
      if (await confirm({ title: "Discard this workout?", message: "No sets are ticked yet, so there is nothing to save.", confirmLabel: "Discard", cancelLabel: "Keep going", tone: "danger" })) discard();
      return;
    }
    // Unticked sets are dropped; empty exercises too. A note left over
    // from last time is carried forward so it shows again next time.
    const finished: Workout = {
      ...workout,
      finished_at: new Date().toISOString(),
      exercises: workout.exercises
        .map((ex) => ({ ...ex, note: ex.note ?? lastPerformance(history, ex.exerciseId, workout.id)?.note, sets: ex.sets.filter((s) => s.done) }))
        .filter((ex) => ex.sets.length > 0),
    };
    setError(null);
    try {
      await save.mutateAsync(finished);
      saveDraft(null);
      saveWarmupTicks(finished.id, null);
      setRest(null);
      navigate(`/history/${finished.id}?done=1`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Your workout is still here — try again.");
    }
  }

  function discard() {
    if (workout) saveWarmupTicks(workout.id, null);
    saveDraft(null);
    setRest(null);
    navigate("/", { replace: true });
  }

  const done = workoutSetCount(workout);
  const total = workout.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  return (
    <div className="min-h-screen pb-32">
      <header className="pt-safe sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Link to="/" className="-ml-2 rounded-full p-2 text-muted-foreground active:bg-muted" aria-label="Back (workout is kept)">
            <BackIcon />
          </Link>
          <ProgressRing value={total ? done / total : 0} label={`${done}/${total}`} />
          <div className="min-w-0 flex-1">
            <input
              className="font-display w-full bg-transparent text-xl font-black outline-none"
              value={workout.title}
              onChange={(e) => change({ ...workout, title: e.target.value })}
              aria-label="Workout name"
            />
            <p className="text-xs font-semibold text-muted-foreground tabular-nums">
              <Elapsed since={workout.started_at} /> · {done} of {total} sets
            </p>
          </div>
          <button className="btn-primary !rounded-full !px-5 !py-2.5" onClick={finish} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Finish"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {workout.exercises.length > 0 && <WarmupSection workout={workout} history={history} />}
        <WorkoutEditor
          workout={workout}
          history={history}
          onChange={change}
          live
          onSetDone={(ex) => {
            if (!restTimerEnabled()) return;
            const seconds = loadExerciseRest(ex.exerciseId) ?? loadRestSeconds();
            const now = Date.now();
            setRest({ startedAt: now, endsAt: now + seconds * 1000, exerciseId: ex.exerciseId });
          }}
        />
        <textarea
          className="field min-h-20"
          placeholder="Notes (how it felt, sleep, anything that hurt)…"
          value={workout.note ?? ""}
          onChange={(e) => change({ ...workout, note: e.target.value || null })}
        />
        <button className="w-full py-3 text-sm font-semibold text-destructive" onClick={async () => (await confirm({ title: "Discard this workout?", message: "Everything logged in this session will be thrown away.", confirmLabel: "Discard", cancelLabel: "Keep going", tone: "danger" })) && discard()}>
          Discard workout
        </button>
      </main>

      {rest && <RestTimer key={rest.startedAt} rest={rest} onAdjust={adjustRest} onClose={() => setRest(null)} />}
    </div>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-11 w-11 shrink-0" aria-hidden="true">
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--muted)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">{label}</span>
    </div>
  );
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Elapsed({ since }: { since: string }) {
  const now = useNow(1000);
  const s = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return <>{h > 0 ? `${h}h ${m}m` : `${m}:${String(s % 60).padStart(2, "0")}`}</>;
}

function RestTimer({ rest, onAdjust, onClose }: { rest: RestState; onAdjust: (by: number) => void; onClose: () => void }) {
  const now = useNow(250);
  const { endsAt, startedAt } = rest;
  const left = Math.ceil((endsAt - now) / 1000);
  const total = Math.max(1, (endsAt - startedAt) / 1000);
  const fired = useRef(false);

  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      restDoneFeedback();
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [left, onClose]);

  const over = left <= 0;
  const mm = Math.floor(Math.max(0, left) / 60);
  const ss = String(Math.max(0, left) % 60).padStart(2, "0");

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto mb-3 flex max-w-xl items-center gap-2 px-4">
        <div
          className={`animate-in relative flex flex-1 items-center justify-between overflow-hidden rounded-3xl px-5 py-3.5 shadow-2xl ${over ? "bg-primary text-primary-foreground" : "bg-foreground text-background"}`}
        >
          <div>
            <p className="text-[11px] font-semibold tracking-wide uppercase opacity-70">{over ? "Rest over" : "Rest"}</p>
            <p className="font-display text-3xl font-black tabular-nums">{over ? "Onward!" : `${mm}:${ss}`}</p>
          </div>
          {!over && <div className="absolute inset-x-0 bottom-0 h-1 bg-primary transition-[width] duration-300" style={{ width: `${Math.max(0, ((endsAt - now) / 1000 / total) * 100)}%` }} />}
          {!over && (
            <div className="flex gap-1.5 text-sm font-semibold">
              <button className="rounded-full bg-background/15 px-3 py-2" onClick={() => onAdjust(-15)}>
                −15
              </button>
              <button className="rounded-full bg-background/15 px-3 py-2" onClick={() => onAdjust(15)}>
                +15
              </button>
              <button className="rounded-full bg-background/15 px-3 py-2" onClick={onClose}>
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
