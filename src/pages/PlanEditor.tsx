import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExercisePicker } from "../components/ExercisePicker";
import { BackIcon } from "../components/Icons";
import { useActiveProgram, usePlans, useSavePlan } from "../hooks/useData";
import { defFor, EXERCISES, MUSCLE_LABEL, PROGRAMS, type PlanDay, type PlanExercise, type Program } from "../lib/program";
import type { ExerciseDef } from "../lib/types";

function blankPlan(): Program {
  return {
    id: crypto.randomUUID(),
    name: "My plan",
    description: "",
    daysPerWeek: 1,
    custom: true,
    days: [{ key: crypto.randomUUID().slice(0, 8), name: "Day 1", focus: "", exercises: [] }],
  };
}

function initialPlan(param: string | undefined, plans: Program[]): Program | null {
  if (!param || param === "new") return blankPlan();
  if (param.startsWith("copy:")) {
    const source = PROGRAMS.find((p) => p.id === param.slice(5)) ?? plans.find((p) => p.id === param.slice(5));
    if (!source) return null;
    return { ...structuredClone(source), id: crypto.randomUUID(), name: `${source.name} (mine)`, custom: true };
  }
  const own = plans.find((p) => p.id === param);
  return own ? structuredClone(own) : null;
}

// Waits for saved plans before seeding the form, so opening /plans/:id
// directly (a reload) finds the plan instead of saying it's gone.
export function PlanEditor() {
  const { id } = useParams();
  const { isLoading } = usePlans();
  if (isLoading) return <p className="pt-6 text-muted-foreground">Loading…</p>;
  return <PlanForm key={id} id={id} />;
}

// Plain form, no drag and drop: name the days, add exercises, set sets and
// rep ranges. Everything else (rest, progression) the app handles.
function PlanForm({ id }: { id: string | undefined }) {
  const navigate = useNavigate();
  const { plans, setActive } = useActiveProgram();
  const save = useSavePlan();
  const [plan, setPlan] = useState<Program | null>(() => initialPlan(id, plans));
  const [picker, setPicker] = useState<{ day: number; index: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!plan) {
    return (
      <div className="pt-6">
        <p>That plan isn't here.</p>
        <Link to="/plans" className="text-primary">Back to plans</Link>
      </div>
    );
  }

  function updateDay(i: number, patch: Partial<PlanDay> | null) {
    setPlan((p) => {
      if (!p) return p;
      const days = [...p.days];
      if (patch) days[i] = { ...days[i], ...patch };
      else days.splice(i, 1);
      return { ...p, days };
    });
  }

  function moveDay(i: number, by: number) {
    setPlan((p) => {
      if (!p || i + by < 0 || i + by >= p.days.length) return p;
      const days = [...p.days];
      [days[i], days[i + by]] = [days[i + by], days[i]];
      return { ...p, days };
    });
  }

  function updateExercise(day: number, index: number, patch: Partial<PlanExercise> | null) {
    const list = [...plan!.days[day].exercises];
    if (patch) list[index] = { ...list[index], ...patch };
    else list.splice(index, 1);
    updateDay(day, { exercises: list });
  }

  function moveExercise(day: number, index: number, by: number) {
    const list = [...plan!.days[day].exercises];
    if (index + by < 0 || index + by >= list.length) return;
    [list[index], list[index + by]] = [list[index + by], list[index]];
    updateDay(day, { exercises: list });
  }

  function pick(def: ExerciseDef) {
    if (!picker) return;
    const entry: Pick<PlanExercise, "exerciseId" | "custom"> = { exerciseId: def.id, custom: EXERCISES[def.id] ? undefined : def };
    if (picker.index === null) {
      const compound = def.kind === "compound";
      updateDay(picker.day, {
        exercises: [...plan!.days[picker.day].exercises, { ...entry, sets: 3, repMin: compound ? 6 : 10, repMax: compound ? 10 : 15 }],
      });
    } else {
      updateExercise(picker.day, picker.index, { ...entry, tip: undefined, alternatives: undefined });
    }
    setPicker(null);
  }

  async function submit() {
    if (!plan) return;
    const cleaned: Program = { ...plan, days: plan.days.filter((d) => d.exercises.length), daysPerWeek: plan.days.length };
    if (!cleaned.name.trim()) return setError("Give the plan a name.");
    if (!cleaned.days.length) return setError("Add at least one exercise.");
    setError(null);
    await save.mutateAsync(cleaned);
    setActive(cleaned.id);
    navigate("/plans", { replace: true });
  }

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-center gap-2 pt-6">
        <Link to="/plans" className="-ml-2 rounded-full p-2 text-muted-foreground" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="font-display flex-1 text-2xl font-black">Edit plan</h1>
        <button className="btn-primary !rounded-full !py-2.5" onClick={submit} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </header>
      {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="card space-y-2 p-4">
        <input className="field font-display text-lg font-black" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} placeholder="Plan name" />
        <input className="field text-sm" value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} placeholder="Short description (optional)" />
      </section>

      {plan.days.map((day, di) => (
        <section key={day.key} className="card p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black">{di + 1}</span>
            <input className="font-display min-w-0 flex-1 bg-transparent text-xl font-black outline-none" value={day.name} onChange={(e) => updateDay(di, { name: e.target.value })} aria-label="Day name" />
            <button className="rounded-lg px-2 py-1 text-muted-foreground" onClick={() => moveDay(di, -1)} aria-label="Move day up">↑</button>
            <button className="rounded-lg px-2 py-1 text-muted-foreground" onClick={() => moveDay(di, 1)} aria-label="Move day down">↓</button>
            <button className="rounded-lg px-2 py-1 text-destructive" onClick={() => updateDay(di, null)} aria-label="Remove day">✕</button>
          </div>
          <input className="mt-1 w-full bg-transparent pl-10 text-xs text-muted-foreground outline-none" value={day.focus} onChange={(e) => updateDay(di, { focus: e.target.value })} placeholder="Focus, e.g. Chest · Shoulders · Triceps" />

          <ul className="mt-3 divide-y divide-border">
            {day.exercises.map((p, ei) => {
              const def = defFor(p);
              return (
                <li key={`${ei}-${p.exerciseId}`} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <button className="min-w-0 text-left" onClick={() => setPicker({ day: di, index: ei })}>
                      <p className="font-semibold">{def.name}</p>
                      <p className="text-xs text-muted-foreground">{MUSCLE_LABEL[def.primary]} · tap to change</p>
                    </button>
                    <div className="flex shrink-0 text-muted-foreground">
                      <button className="px-1.5" onClick={() => moveExercise(di, ei, -1)} aria-label="Move up">↑</button>
                      <button className="px-1.5" onClick={() => moveExercise(di, ei, 1)} aria-label="Move down">↓</button>
                      <button className="px-1.5 text-destructive" onClick={() => updateExercise(di, ei, null)} aria-label="Remove">✕</button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Num value={p.sets} min={1} max={10} onChange={(sets) => updateExercise(di, ei, { sets })} label="Sets" />
                    <span className="text-muted-foreground">sets ×</span>
                    <Num value={p.repMin} min={1} max={50} onChange={(repMin) => updateExercise(di, ei, { repMin, repMax: Math.max(repMin, p.repMax) })} label="Min reps" />
                    <span className="text-muted-foreground">–</span>
                    <Num value={p.repMax} min={1} max={50} onChange={(repMax) => updateExercise(di, ei, { repMax, repMin: Math.min(repMax, p.repMin) })} label="Max reps" />
                    <span className="text-muted-foreground">reps</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="btn-ghost mt-2 w-full" onClick={() => setPicker({ day: di, index: null })}>
            + Add exercise
          </button>
        </section>
      ))}

      <button
        className="btn-ghost w-full py-4"
        onClick={() => setPlan({ ...plan, days: [...plan.days, { key: crypto.randomUUID().slice(0, 8), name: `Day ${plan.days.length + 1}`, focus: "", exercises: [] }] })}
      >
        + Add a day
      </button>

      {picker && (
        <ExercisePicker
          title={picker.index === null ? "Add exercise" : "Change exercise"}
          onPick={pick}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function Num({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      className="h-10 w-14 rounded-xl border border-border bg-background text-center font-semibold tabular-nums outline-none focus:border-primary"
      value={value}
      min={min}
      max={max}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const n = Math.round(Number(e.target.value));
        if (n >= min && n <= max) onChange(n);
      }}
    />
  );
}
