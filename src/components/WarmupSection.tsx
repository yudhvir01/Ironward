import { useState } from "react";
import { EXERCISES } from "../lib/program";
import { deloadActive, loadBar, loadStepKg, loadWarmupTicks, saveWarmupTicks } from "../lib/local";
import { ROUND_STEP, warmupSets } from "../lib/plates";
import { fromUnit, getUnit, toUnit } from "../lib/units";
import { lastPerformance, suggest } from "../lib/stats";
import { tapFeedback } from "../lib/feedback";
import type { Workout } from "../lib/types";
import { CheckIcon } from "./Icons";
import { PlateCalculator } from "./PlateCalculator";

interface Step {
  id: string;
  title: string;
  detail?: string;
  // Set only for barbell lifts — plate maths means nothing on dumbbells.
  kg?: number;
}

// The plan's warm-up, laid out as the first thing in every session: easy
// cardio, then ramp-up sets toward the first big lift, and one lighter
// "feeler" set before each other big lift. Nothing here is logged.
function buildSteps(workout: Workout, history: Workout[]): { steps: Step[]; groups: { name: string; steps: Step[] }[] } {
  const unit = getUnit();
  const bar = loadBar(unit);
  const opts = { stepKg: loadStepKg(), deload: deloadActive() };
  const groups: { name: string; steps: Step[] }[] = [];
  const compounds = workout.exercises.filter((e) => e.kind === "compound");
  compounds.forEach((ex, i) => {
    const targetKg = ex.sets[0]?.weight ?? suggest(ex, lastPerformance(history, ex.exerciseId, workout.id), opts).sets[0]?.weight ?? null;
    // Worked out in the unit on screen so the numbers are loadable.
    const target = targetKg ? toUnit(targetKg) : null;
    const barbell = ex.barbell ?? EXERCISES[ex.exerciseId]?.barbell ?? false;
    let steps: Step[];
    if (i === 0) {
      steps = target
        ? warmupSets(target, barbell, bar, ROUND_STEP[unit]).map((w, j) => ({ id: `${ex.exerciseId}:${j}`, title: `${w.weight} ${unit} × ${w.reps}`, kg: barbell ? fromUnit(w.weight) : undefined }))
        : [{ id: `${ex.exerciseId}:ramp`, title: "2–3 light sets", detail: "Build up gradually to your working weight" }];
    } else {
      // A second warm-up only before the next big lifts, and just one set.
      const w = target ? Math.round((target * 0.6) / ROUND_STEP[unit]) * ROUND_STEP[unit] : null;
      steps = [{ id: `${ex.exerciseId}:feeler`, title: w ? `${w} ${unit} × 5` : "1 light set × 5", detail: "Feeler set", kg: barbell && w ? fromUnit(w) : undefined }];
    }
    if (steps.length) groups.push({ name: ex.name, steps });
  });
  const cardio: Step = { id: "cardio", title: "5 min easy cardio", detail: "Bike, brisk walk or cross-trainer" };
  return { steps: [cardio, ...groups.flatMap((g) => g.steps)], groups: [{ name: "General", steps: [cardio] }, ...groups] };
}

export function WarmupSection({ workout, history }: { workout: Workout; history: Workout[] }) {
  const [ticks, setTicks] = useState<string[]>(() => loadWarmupTicks(workout.id));
  const [plates, setPlates] = useState<number | null>(null);
  const [open, setOpen] = useState(true);
  const { steps, groups } = buildSteps(workout, history);
  const done = steps.filter((s) => ticks.includes(s.id)).length;
  const complete = done === steps.length;
  const started = workout.exercises.some((e) => e.sets.some((s) => s.done));

  function toggle(id: string) {
    const next = ticks.includes(id) ? ticks.filter((t) => t !== id) : [...ticks, id];
    if (!ticks.includes(id)) tapFeedback();
    setTicks(next);
    saveWarmupTicks(workout.id, next);
  }

  // Folded into one line once it's done (or the first working set is
  // ticked) — tap to see it again.
  if ((complete || started) && !open) {
    return (
      <button className="card flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-2 font-bold">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${complete ? "bg-done text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <CheckIcon size={14} />
          </span>
          Warm-up {complete ? "done" : `${done}/${steps.length}`}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">Show</span>
      </button>
    );
  }

  return (
    <section className="card animate-in overflow-hidden">
      <div className="flex items-center justify-between bg-primary-soft px-4 py-3">
        <div>
          <p className="font-display text-lg font-black">Warm up first</p>
          <p className="text-xs text-muted-foreground">Takes ~10 min · not logged as sets</p>
        </div>
        <span className="font-display text-lg font-black tabular-nums">
          {done}/{steps.length}
        </span>
      </div>
      <div className="space-y-4 p-4">
        {groups.map((g) => (
          <div key={g.name}>
            <p className="label mb-1.5">{g.name === "General" ? "General" : `Before ${g.name}`}</p>
            <div className="space-y-1.5">
              {g.steps.map((s) => {
                const on = ticks.includes(s.id);
                return (
                  <div key={s.id} className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${on ? "bg-done/10" : "bg-muted/60"}`}>
                    <button
                      onClick={() => toggle(s.id)}
                      aria-label={on ? `Undo ${s.title}` : `Done ${s.title}`}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? "animate-pop bg-done text-primary-foreground" : "bg-background text-muted-foreground"}`}
                    >
                      <CheckIcon size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold tabular-nums ${on ? "text-muted-foreground line-through" : ""}`}>{s.title}</p>
                      {s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}
                    </div>
                    {s.kg ? (
                      <button className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground" onClick={() => setPlates(s.kg!)}>
                        Plates
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {(complete || started) && (
          <button className="w-full text-center text-xs font-bold text-muted-foreground" onClick={() => setOpen(false)}>
            Hide warm-up
          </button>
        )}
      </div>
      {plates !== null && <PlateCalculator initialKg={plates} onClose={() => setPlates(null)} />}
    </section>
  );
}
