import { useConfirm } from "../components/ConfirmDialog";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IronwardMark } from "../components/Logo";
import { MuscleMap } from "../components/MuscleMap";
import { PendingSyncNote } from "../components/OutboxSync";
import { WeighInCard } from "../components/BodyWeight";
import { WeekStrip } from "../components/WeekStrip";
import { useActiveProgram, useWorkouts } from "../hooks/useData";
import { deloadActive, endDeload, isOnboarded, loadDraft, loadMuscleFix, loadOverrides, saveDraft, setOnboarded, startDeload } from "../lib/local";
import { defFor, MUSCLE_LABEL, repRange, type PlanDay } from "../lib/program";
import {
  blockPhase,
  dayOf,
  fmtDay,
  fmtVolume,
  localDay,
  muscleSets,
  nextPlanDay,
  stalledLifts,
  startWorkout,
  thisWeek,
  workoutSetCount,
  workoutVolume,
} from "../lib/stats";

export function Today() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { data: workouts = [], isLoading } = useWorkouts();
  const { program } = useActiveProgram();
  const draft = loadDraft();
  const next = nextPlanDay(program, workouts);
  const [picked, setPicked] = useState<PlanDay | null>(null);
  const [deload, setDeload] = useState(deloadActive());
  const day = picked ?? next;
  const swaps = loadOverrides(program.id, day.key).swaps;

  // First visit goes through the welcome steps; anyone who already has
  // workouts (say, signing in on a new phone) skips them.
  useEffect(() => {
    if (isLoading) return;
    if (workouts.length) setOnboarded();
    else if (!isOnboarded()) navigate("/welcome", { replace: true });
  }, [isLoading, workouts.length, navigate]);
  const stalled = stalledLifts(workouts);

  const week = thisWeek();
  const doneThisWeek = workouts.filter((w) => Date.parse(w.started_at) >= week.from.getTime());
  const trainedToday = workouts.some((w) => dayOf(w.started_at) === localDay());
  const phase = blockPhase(workouts);
  const sets = muscleSets(workouts, week.from, week.to);
  const muscles = [...new Set(day.exercises.map((p) => (swaps[p.exerciseId] ?? defFor(p)).primary))];
  const totalSets = day.exercises.reduce((n, p) => n + p.sets, 0);

  async function start(d: PlanDay | null) {
    if (draft && !(await confirm({ title: "Start a new workout?", message: "You have a workout in progress. Starting a new one throws it away.", confirmLabel: "Start new", cancelLabel: "Keep it", tone: "danger" }))) return;
    const o = d ? loadOverrides(program.id, d.key) : null;
    const w = startWorkout(d ? program : null, d, { swaps: o?.swaps, supersets: o?.supersets, deload: deloadActive() });
    // Muscle corrections made in How-to apply to every later session.
    w.exercises = w.exercises.map((e) => ({ ...e, primary: loadMuscleFix(e.exerciseId) ?? e.primary }));
    saveDraft(w);
    navigate("/workout");
  }

  const hour = new Date().getHours();
  const greeting = trainedToday ? "Done. Onward." : hour < 12 ? "Morning. Onward." : hour < 17 ? "Let's move forward" : "Evening iron?";

  return (
    <div className="space-y-4 pb-4">
      <header className="animate-in pt-7 pb-1">
        <IronwardMark size={30} className="mb-3 rounded-lg" />
        <p className="text-sm font-semibold text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="font-display mt-0.5 text-4xl font-black">{greeting}</h1>
      </header>

      <section className="card animate-in p-4">
        <WeekStrip workouts={workouts} />
        <div className="mt-4 grid grid-cols-3 divide-x divide-border text-center">
          <Stat value={`${doneThisWeek.length}/${program.daysPerWeek}`} label="workouts" />
          <Stat value={String(doneThisWeek.reduce((n, w) => n + workoutSetCount(w), 0))} label="sets" />
          <Stat value={fmtVolume(doneThisWeek.reduce((n, w) => n + workoutVolume(w), 0))} label="lifted" />
        </div>
      </section>

      <PendingSyncNote />

      {draft && (
        <Link to="/workout" className="card animate-in flex items-center justify-between gap-3 border-primary/60 bg-primary-soft p-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <div>
              <p className="font-display text-lg font-black">{draft.title}</p>
              <p className="text-xs text-muted-foreground">
                In progress · started {new Date(draft.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <span className="btn-primary !py-2.5">Resume</span>
        </Link>
      )}

      <section className="card glow animate-in overflow-hidden p-5">
        <div className="flex items-center justify-between">
          <Link to="/plans" className="label">
            {picked ? "Your pick" : "Up next"} · <span className="underline decoration-dotted">{program.name}</span>
          </Link>
          <p className="shrink-0 text-xs font-semibold text-muted-foreground">{totalSets} sets</p>
        </div>
        <h2 className="font-display mt-1 text-5xl leading-none font-black">{day.name}</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {muscles.map((m) => (
            <span key={m} className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px] font-semibold">
              {MUSCLE_LABEL[m]}
            </span>
          ))}
        </div>
        <ol className="mt-5 space-y-2.5">
          {day.exercises.map((p, i) => (
            <li key={p.exerciseId} className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">{i + 1}</span>
              <span className="flex-1 font-medium">{(swaps[p.exerciseId] ?? defFor(p)).name}</span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                {p.sets} × {repRange(p)}
              </span>
            </li>
          ))}
        </ol>
        <button className="btn-primary font-display mt-6 w-full py-4 text-lg font-black" onClick={() => start(day)}>
          Start {day.name} »
        </button>
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {program.days.map((d) => (
            <button
              key={d.key}
              onClick={() => setPicked(d.key === next.key ? null : d)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                d.key === day.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {d.name}
            </button>
          ))}
          <button onClick={() => start(null)} className="shrink-0 rounded-full border border-dashed border-border px-3.5 py-2 text-xs font-bold text-muted-foreground">
            + Empty
          </button>
        </div>
      </section>

      {deload ? (
        <section className="card animate-in flex items-center justify-between gap-3 border-warn/50 p-4">
          <div>
            <p className="font-bold text-warn">Deload week</p>
            <p className="text-sm text-muted-foreground">Half the sets, ~10% lighter, stop well short of failure. Then push again.</p>
          </div>
          <button
            className="shrink-0 rounded-full bg-muted px-3 py-2 text-xs font-bold"
            onClick={() => {
              endDeload();
              setDeload(false);
            }}
          >
            End
          </button>
        </section>
      ) : (
        stalled.length >= 2 && (
          <section className="card animate-in border-warn/50 p-4">
            <p className="font-bold text-warn">{stalled.length} lifts have stalled</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {stalled.slice(0, 3).map((s) => s.name).join(", ")} haven't improved in 3 sessions. A lighter week usually fixes it.
            </p>
            <button
              className="btn-ghost mt-3 w-full"
              onClick={() => {
                startDeload();
                setDeload(true);
              }}
            >
              Start a deload week
            </button>
          </section>
        )
      )}

      <WeighInCard />

      {phase && (
        <section className="card animate-in flex gap-4 p-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-muted">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Week</span>
            <span className="font-display text-xl leading-none font-black">{phase.week}</span>
          </div>
          <div>
            <p className="font-bold">{phase.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{phase.advice}</p>
          </div>
        </section>
      )}

      {doneThisWeek.length > 0 && (
        <section className="card animate-in p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="label">Muscles hit this week</p>
            <Link to="/progress" className="text-xs font-bold text-primary">
              Reports →
            </Link>
          </div>
          <MuscleMap sets={sets} />
        </section>
      )}

      {workouts[0] && (
        <Link to={`/history/${workouts[0].id}`} className="card animate-in flex items-center justify-between p-4">
          <div>
            <p className="label">Last workout</p>
            <p className="mt-1 font-bold">
              {workouts[0].title} <span className="font-medium text-muted-foreground">· {fmtDay(dayOf(workouts[0].started_at))}</span>
            </p>
          </div>
          <span className="text-muted-foreground">→</span>
        </Link>
      )}

      {workouts.length === 0 && !isLoading && (
        <Link to="/guide" className="card animate-in block p-4">
          <p className="font-bold">New here? Read the 2-minute guide →</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Progressive overload, RIR, rest times — everything the app nudges you toward.</p>
        </Link>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl font-black tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
