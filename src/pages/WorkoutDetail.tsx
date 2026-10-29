import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { WorkoutEditor } from "../components/WorkoutEditor";
import { BackIcon, TrophyIcon } from "../components/Icons";
import { useDeleteWorkout, useSaveWorkout, useWorkouts } from "../hooks/useData";
import { MUSCLE_LABEL } from "../lib/program";
import { dayOf, durationMinutes, e1rm, fmtDay, fmtKg, fmtVolume, isCounted, prsIn, round1, workoutSetCount, workoutVolume } from "../lib/stats";
import type { Workout } from "../lib/types";
import { toUnit } from "../lib/units";

export function WorkoutDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: workouts = [], isLoading } = useWorkouts();
  const save = useSaveWorkout();
  const remove = useDeleteWorkout();
  const [editing, setEditing] = useState<Workout | null>(null);

  const workout = workouts.find((w) => w.id === id);
  if (isLoading) return <p className="pt-6 text-muted-foreground">Loading…</p>;
  if (!workout) {
    return (
      <div className="pt-6">
        <p>That workout isn't here anymore.</p>
        <Link to="/history" className="text-primary">Back to history</Link>
      </div>
    );
  }

  const justFinished = params.has("done");
  const prs = prsIn(workout, workouts);
  const minutes = durationMinutes(workout);

  async function saveEdit() {
    if (!editing) return;
    // A set added while editing counts once it has reps, ticked or not.
    await save.mutateAsync({
      ...editing,
      exercises: editing.exercises
        .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done || s.reps !== null).map((s) => ({ ...s, done: true })) }))
        .filter((ex) => ex.sets.length),
    });
    setEditing(null);
  }

  async function del() {
    if (!workout || !confirm("Delete this workout for good?")) return;
    await remove.mutateAsync(workout.id);
    navigate("/history", { replace: true });
  }

  if (editing) {
    return (
      <div className="pb-6">
        <header className="flex items-center justify-between pt-6 pb-4">
          <button className="text-sm font-semibold text-muted-foreground" onClick={() => setEditing(null)}>
            Cancel
          </button>
          <h1 className="font-bold">Edit workout</h1>
          <button className="btn-primary !py-2" onClick={saveEdit} disabled={save.isPending}>
            Save
          </button>
        </header>
        <WorkoutEditor workout={editing} history={workouts} onChange={setEditing} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="flex items-center gap-2 pt-6">
        <Link to={justFinished ? "/" : "/history"} className="-ml-2 rounded-lg p-2 text-muted-foreground" aria-label="Back">
          <BackIcon />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-black">{workout.title}</h1>
          <p className="text-sm text-muted-foreground">{fmtDay(dayOf(workout.started_at), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </header>

      <section className={`card animate-in p-5 ${justFinished ? "glow border-primary/50" : ""}`}>
        {justFinished && (
          <>
            <p className="font-display text-3xl font-black">One step forward. <span className="ember-text">Onward.</span></p>
            <p className="mt-1 text-sm text-muted-foreground">Protein, 7–9 hours of sleep, then come back and beat these numbers.</p>
          </>
        )}
        <div className={`grid grid-cols-3 divide-x divide-border text-center ${justFinished ? "mt-5" : ""}`}>
          <Mini label="sets" value={String(workoutSetCount(workout))} />
          <Mini label="lifted" value={fmtVolume(workoutVolume(workout))} />
          <Mini label="minutes" value={minutes ? String(minutes) : "–"} />
        </div>
      </section>

      {prs.length > 0 && (
        <section className="card animate-in overflow-hidden">
          <div className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
            <TrophyIcon size={22} />
            <p className="font-display text-lg font-black">
              {prs.length} new personal record{prs.length > 1 ? "s" : ""}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {prs.map((pr) => (
              <li key={pr.exercise} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <b>{pr.exercise}</b>
                <span className="text-right font-semibold text-primary">{pr.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {workout.exercises.map((ex, i) => (
        <section key={i} className="card p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display font-black">{ex.name}</h3>
            <span className="text-xs text-muted-foreground">{MUSCLE_LABEL[ex.primary]}</span>
          </div>
          <ol className="mt-2 space-y-1 text-sm tabular-nums">
            {ex.sets.filter(isCounted).map((s, j) => (
              <li key={j} className="flex justify-between">
                <span>
                  <span className="mr-3 text-muted-foreground">{j + 1}</span>
                  {s.weight ? fmtKg(s.weight) : "Bodyweight"} × {s.reps}
                  {s.rir !== null && <span className="ml-2 text-xs text-muted-foreground">RIR {s.rir}</span>}
                </span>
                {s.weight ? <span className="text-xs text-muted-foreground">e1RM {toUnit(round1(e1rm(s.weight, s.reps)))}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ))}

      {workout.note && (
        <section className="card p-4">
          <p className="label">Notes</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{workout.note}</p>
        </section>
      )}

      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={() => setEditing(structuredClone(workout))}>
          Edit
        </button>
        <button className="btn-danger flex-1" onClick={del}>
          Delete
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-black tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
