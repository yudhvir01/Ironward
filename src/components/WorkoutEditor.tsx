import { useState } from "react";
import { usePlans } from "../hooks/useData";
import { deloadActive, loadExerciseNote, loadMuscleFix, loadOverrides, loadStepKg, saveExerciseNote, saveOverrides } from "../lib/local";
import { EXERCISES, findProgram, MUSCLE_LABEL, repRange } from "../lib/program";
import { lastPerformance, suggest, type Suggestion } from "../lib/stats";
import { tapFeedback } from "../lib/feedback";
import { fromUnit, getUnit, toUnit } from "../lib/units";
import type { ExerciseDef, LoggedExercise, LoggedSet, SetTag, Workout } from "../lib/types";
import { ExercisePicker } from "./ExercisePicker";
import { HowTo } from "./HowTo";
import { PlateCalculator } from "./PlateCalculator";
import { CheckIcon, MoreIcon, PlusIcon } from "./Icons";

const emptySet = (): LoggedSet => ({ weight: null, reps: null, rir: null, done: false });

// The set-by-set logger. Used live (from the draft) and to fix up a past
// workout. Live, swaps and supersets can be remembered for next time, and
// `onSetDone` is called when a rest should start (for a superset: only
// once the whole round is done).
export function WorkoutEditor({
  workout,
  history,
  onChange,
  onSetDone,
  live = false,
}: {
  workout: Workout;
  history: Workout[];
  onChange: (w: Workout) => void;
  onSetDone?: (ex: LoggedExercise) => void;
  live?: boolean;
}) {
  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "swap"; index: number } | null>(null);
  const { data: plans = [] } = usePlans();
  const planDay = workout.program_id ? findProgram(workout.program_id, plans).days.find((d) => d.key === workout.day_key) : undefined;
  const stepKg = loadStepKg();
  const deload = live && deloadActive();

  function updateExercise(index: number, next: LoggedExercise | null) {
    const exercises = [...workout.exercises];
    if (next) exercises[index] = next;
    else exercises.splice(index, 1);
    onChange({ ...workout, exercises: regroup(exercises) });
  }

  function move(index: number, by: number) {
    const to = index + by;
    if (to < 0 || to >= workout.exercises.length) return;
    const exercises = [...workout.exercises];
    [exercises[index], exercises[to]] = [exercises[to], exercises[index]];
    onChange({ ...workout, exercises: regroup(exercises) });
  }

  function remember(update: (o: ReturnType<typeof loadOverrides>) => void) {
    if (!live) return;
    const o = loadOverrides(workout.program_id, workout.day_key);
    update(o);
    saveOverrides(workout.program_id, workout.day_key, o);
  }

  function toggleSuperset(index: number) {
    const ex = workout.exercises[index];
    const next = workout.exercises[index + 1];
    if (!next && !ex.superset) return;
    const exercises = [...workout.exercises];
    const linked = Boolean(ex.superset && next?.superset === ex.superset);
    if (linked) {
      exercises[index + 1] = { ...next, superset: undefined };
      if (!exercises.some((e, j) => j !== index && e.superset === ex.superset)) exercises[index] = { ...ex, superset: undefined };
    } else if (next) {
      const group = ex.superset ?? next.superset ?? `s${Date.now()}`;
      exercises[index] = { ...ex, superset: group };
      exercises[index + 1] = { ...next, superset: group };
    }
    if (ex.slot) {
      remember((o) => {
        o.supersets = o.supersets.filter((s) => s !== ex.slot);
        if (!linked) o.supersets.push(ex.slot!);
      });
    }
    onChange({ ...workout, exercises: regroup(exercises) });
  }

  function pick(def: ExerciseDef, keep: boolean) {
    if (!picker) return;
    if (picker.mode === "swap") {
      const old = workout.exercises[picker.index];
      updateExercise(picker.index, {
        ...old,
        exerciseId: def.id,
        name: def.name,
        primary: loadMuscleFix(def.id) ?? def.primary,
        secondary: def.secondary ?? [],
        kind: def.kind,
        bodyweight: def.bodyweight,
        barbell: def.barbell,
        note: undefined,
        sets: old.sets.map(emptySet),
      });
      if (old.slot) {
        remember((o) => {
          if (keep && def.id !== old.slot) o.swaps[old.slot!] = def;
          else delete o.swaps[old.slot!];
        });
      }
    } else {
      const compound = def.kind === "compound";
      onChange({
        ...workout,
        exercises: [
          ...workout.exercises,
          {
            exerciseId: def.id,
            name: def.name,
            primary: loadMuscleFix(def.id) ?? def.primary,
            secondary: def.secondary ?? [],
            kind: def.kind,
            bodyweight: def.bodyweight,
            barbell: def.barbell,
            repMin: compound ? 6 : 10,
            repMax: compound ? 10 : 15,
            sets: Array.from({ length: 3 }, emptySet),
          },
        ],
      });
    }
    setPicker(null);
  }

  // Ticking a set inside a superset only starts the rest once every
  // exercise in the group has that round done.
  function setDone(index: number, updated: LoggedExercise, setIndex: number) {
    if (!onSetDone) return;
    const group = updated.superset;
    if (group) {
      const roundDone = workout.exercises.every((e, j) => {
        if (e.superset !== group) return true;
        const ex = j === index ? updated : e;
        return !ex.sets[setIndex] || ex.sets[setIndex].done;
      });
      if (!roundDone) return;
    }
    onSetDone(updated);
  }

  const swapFor = picker?.mode === "swap" ? workout.exercises[picker.index] : null;
  const swapPlan = swapFor ? planDay?.exercises.find((p) => p.exerciseId === (swapFor.slot ?? swapFor.exerciseId)) : undefined;

  return (
    <div className="space-y-4">
      {workout.exercises.map((ex, i) => {
        const last = lastPerformance(history, ex.exerciseId, workout.id);
        const prev = workout.exercises[i - 1];
        const next = workout.exercises[i + 1];
        const inGroup = Boolean(ex.superset);
        return (
          <div key={`${i}-${ex.exerciseId}`} className={inGroup ? "relative pl-3" : undefined}>
            {inGroup && (
              <span
                className={`absolute left-0 w-1 rounded-full bg-primary ${prev?.superset === ex.superset ? "-top-4" : "top-6"} ${next?.superset === ex.superset ? "-bottom-4" : "bottom-6"}`}
              />
            )}
            <ExerciseCard
              number={i + 1}
              ex={ex}
              last={last}
              tip={planDay?.exercises.find((p) => p.exerciseId === (ex.slot ?? ex.exerciseId))?.tip}
              suggestion={suggest(ex, last, { stepKg, deload })}
              supersetLabel={inGroup && prev?.superset !== ex.superset ? supersetName(workout.exercises, ex.superset!) : null}
              canSuperset={Boolean(next)}
              linkedToNext={Boolean(ex.superset && next?.superset === ex.superset)}
              onChange={(n) => updateExercise(i, n)}
              onSetDone={(updated, setIndex) => setDone(i, updated, setIndex)}
              onSwap={() => setPicker({ mode: "swap", index: i })}
              onMove={(by) => move(i, by)}
              onSuperset={() => toggleSuperset(i)}
            />
          </div>
        );
      })}
      <button className="btn-ghost w-full py-4" onClick={() => setPicker({ mode: "add" })}>
        <PlusIcon size={18} /> Add exercise
      </button>
      {picker && (
        <ExercisePicker
          title={picker.mode === "swap" ? `Swap ${swapFor?.name}` : "Add exercise"}
          suggested={
            swapPlan
              ? [swapPlan.exerciseId, ...(swapPlan.alternatives ?? [])].filter((id) => id !== swapFor?.exerciseId)
              : []
          }
          rememberLabel={live && picker.mode === "swap" && swapFor?.slot ? "Use this every time for this day" : undefined}
          onPick={pick}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

// Superset groups are lettered A, B, … in the order they appear, and a
// group left with one exercise is dissolved.
function regroup(exercises: LoggedExercise[]): LoggedExercise[] {
  return exercises.map((ex, i) => {
    if (!ex.superset) return ex;
    const touching = exercises[i - 1]?.superset === ex.superset || exercises[i + 1]?.superset === ex.superset;
    return touching ? ex : { ...ex, superset: undefined };
  });
}

function supersetName(exercises: LoggedExercise[], group: string): string {
  const order: string[] = [];
  for (const e of exercises) if (e.superset && !order.includes(e.superset)) order.push(e.superset);
  return `Superset ${String.fromCharCode(65 + order.indexOf(group))}`;
}

const RIR_CYCLE: (number | null)[] = [null, 3, 2, 1, 0];
const TAG_CYCLE: (SetTag | undefined)[] = [undefined, "failure", "drop"];
const TAG_LABEL: Record<SetTag, string> = { failure: "F", drop: "D" };

function ExerciseCard({
  number,
  ex,
  last,
  tip,
  suggestion,
  supersetLabel,
  canSuperset,
  linkedToNext,
  onChange,
  onSetDone,
  onSwap,
  onMove,
  onSuperset,
}: {
  number: number;
  ex: LoggedExercise;
  last: LoggedExercise | null;
  tip?: string;
  suggestion: Suggestion;
  supersetLabel: string | null;
  canSuperset: boolean;
  linkedToNext: boolean;
  onChange: (ex: LoggedExercise | null) => void;
  onSetDone: (ex: LoggedExercise, setIndex: number) => void;
  onSwap: () => void;
  onMove: (by: number) => void;
  onSuperset: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<"howto" | "plates" | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.done);
  const def = EXERCISES[ex.exerciseId];
  const perSide = def?.perSide;
  const bodyweight = ex.bodyweight ?? def?.bodyweight ?? false;
  const target = ex.sets[0]?.weight ?? suggestion.sets[0]?.weight ?? null;
  // Today's note if one was written, otherwise last time's carries over.
  const note = ex.note ?? last?.note ?? loadExerciseNote(ex.exerciseId) ?? "";
  const unit = getUnit();

  // What an empty set would be filled with: last session's target, but
  // with the weight actually used on the set above today (people rarely
  // change weight mid-exercise).
  function hintFor(i: number) {
    const base = suggestion.sets[i] ?? suggestion.sets[suggestion.sets.length - 1];
    const above = ex.sets[i - 1];
    if (above?.done && above.weight !== null) return { weight: above.weight, reps: base?.reps ?? above.reps };
    return base;
  }

  function setAt(i: number, patch: Partial<LoggedSet>) {
    onChange({ ...ex, sets: ex.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  }

  function toggle(i: number) {
    const s = ex.sets[i];
    if (s.done) return setAt(i, { done: false });
    const hint = hintFor(i);
    const weight = s.weight ?? hint?.weight ?? null;
    const reps = s.reps ?? hint?.reps ?? null;
    if (reps === null) {
      document.getElementById(`reps-${ex.exerciseId}-${i}`)?.focus();
      return;
    }
    tapFeedback();
    const updated = { ...ex, sets: ex.sets.map((x, j) => (j === i ? { ...x, weight, reps, done: true } : x)) };
    onChange(updated);
    onSetDone(updated, i);
  }

  return (
    <section className={`card animate-in overflow-hidden transition ${allDone ? "border-done/50 opacity-80" : ""}`}>
      {supersetLabel && (
        <p className="bg-primary px-4 py-1 text-[11px] font-black tracking-wide text-primary-foreground uppercase">
          {supersetLabel} · back to back, rest after the round
        </p>
      )}
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div className="flex min-w-0 gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black transition ${
              allDone ? "bg-done text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {allDone ? <CheckIcon size={16} /> : number}
          </span>
          <div className="min-w-0">
            <button className="text-left" onClick={onSwap}>
              <h3 className="font-display text-lg leading-tight font-black">{ex.name}</h3>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {MUSCLE_LABEL[ex.primary]} · {repRange(ex)} reps{perSide ? " per side" : ""} · <span className="underline decoration-dotted">swap</span>
              </p>
            </button>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary" onClick={() => setSheet("howto")}>
                ▶ How to do it
              </button>
              {!note && !editingNote && (
                <button className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground" onClick={() => setEditingNote(true)}>
                  + Note
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <button className="rounded-lg p-1.5 text-muted-foreground active:bg-muted" onClick={() => setMenu((m) => !m)} aria-label="Exercise options">
            <MoreIcon />
          </button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-52 overflow-hidden rounded-2xl border border-border bg-card text-sm shadow-xl" onClick={() => setMenu(false)}>
              <MenuItem onClick={() => setSheet("howto")}>How to do it</MenuItem>
              {!bodyweight && <MenuItem onClick={() => setSheet("plates")}>Plate calculator</MenuItem>}
              <MenuItem onClick={() => setEditingNote(true)}>{note ? "Edit note" : "Add note"}</MenuItem>
              {(canSuperset || linkedToNext) && <MenuItem onClick={onSuperset}>{linkedToNext ? "Unlink superset" : "Superset with next"}</MenuItem>}
              <MenuItem onClick={onSwap}>Swap exercise</MenuItem>
              <MenuItem onClick={() => onMove(-1)}>Move up</MenuItem>
              <MenuItem onClick={() => onMove(1)}>Move down</MenuItem>
              <MenuItem danger onClick={() => onChange(null)}>Remove</MenuItem>
            </div>
          )}
        </div>
      </div>

      {(note || editingNote) &&
        (editingNote ? (
          <input
            autoFocus
            className="field mx-4 mb-1 w-[calc(100%-2rem)] !py-2 text-sm"
            placeholder="e.g. seat on 4, blue cable machine"
            defaultValue={note}
            onBlur={(e) => {
              const text = e.target.value.trim();
              saveExerciseNote(ex.exerciseId, text);
              onChange({ ...ex, note: text });
              setEditingNote(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <button className="mx-4 mb-1 block text-left text-xs font-semibold text-warn" onClick={() => setEditingNote(true)}>
            📝 {note}
          </button>
        ))}

      <p
        className={`mx-4 rounded-xl px-3 py-2 text-xs ${
          suggestion.tone === "up"
            ? "bg-primary-soft font-semibold text-primary"
            : suggestion.tone === "deload"
              ? "bg-warn/10 font-semibold text-warn"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {suggestion.tone === "up" ? "↑ " : ""}
        {suggestion.message}
      </p>
      {tip && <p className="mx-4 mt-2 text-xs text-muted-foreground italic">{tip}</p>}

      <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_3.25rem_3rem] items-center gap-2 px-4 pb-1 text-[11px] font-semibold text-muted-foreground uppercase">
        <span>Set</span>
        <span>{bodyweight ? `+${unit}` : unit}</span>
        <span>Reps</span>
        <span className="text-center">RIR</span>
        <span />
      </div>
      <div className="space-y-1.5 px-4 pb-3">
        {ex.sets.map((s, i) => {
          const hint = hintFor(i);
          return (
            <div key={i} className={`grid grid-cols-[2rem_1fr_1fr_3.25rem_3rem] items-center gap-2 rounded-xl transition-colors ${s.done ? "bg-done/10" : ""}`}>
              <button
                className={`h-11 rounded-lg text-center text-sm font-black ${s.tag ? "bg-warn/15 text-warn" : "text-muted-foreground"}`}
                onClick={() => setAt(i, { tag: TAG_CYCLE[(TAG_CYCLE.indexOf(s.tag) + 1) % TAG_CYCLE.length] })}
                aria-label={`Set ${i + 1} type: ${s.tag ?? "normal"}. Tap to change.`}
                title="Tap: failure (F) / drop set (D)"
              >
                {s.tag ? TAG_LABEL[s.tag] : i + 1}
              </button>
              <NumberInput
                value={s.weight === null ? null : toUnit(s.weight)}
                placeholder={hint?.weight != null ? toUnit(hint.weight) : bodyweight ? "BW" : null}
                decimal
                onChange={(w) => setAt(i, { weight: w === null ? null : fromUnit(w) })}
                label={`Set ${i + 1} ${bodyweight ? "added weight" : "weight"}`}
              />
              <NumberInput
                id={`reps-${ex.exerciseId}-${i}`}
                value={s.reps}
                placeholder={hint?.reps}
                onChange={(reps) => setAt(i, { reps })}
                label={`Set ${i + 1} reps`}
              />
              <button
                className="h-11 rounded-xl bg-muted text-sm font-semibold tabular-nums"
                onClick={() => setAt(i, { rir: RIR_CYCLE[(RIR_CYCLE.indexOf(s.rir) + 1) % RIR_CYCLE.length] })}
                aria-label="Reps in reserve"
              >
                {s.rir ?? "–"}
              </button>
              <button
                onClick={() => toggle(i)}
                aria-label={s.done ? "Undo set" : "Complete set"}
                className={`flex h-11 items-center justify-center rounded-xl transition ${s.done ? "animate-pop bg-done text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                <CheckIcon size={20} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex border-t border-border text-sm font-semibold">
        <button
          className="flex-1 py-3 text-primary active:bg-muted"
          onClick={() => {
            const lastSet = ex.sets[ex.sets.length - 1];
            onChange({ ...ex, sets: [...ex.sets, { ...emptySet(), weight: lastSet?.weight ?? null }] });
          }}
        >
          + Add set
        </button>
        {ex.sets.length > 1 && (
          <button className="flex-1 border-l border-border py-3 text-muted-foreground active:bg-muted" onClick={() => onChange({ ...ex, sets: ex.sets.slice(0, -1) })}>
            − Remove set
          </button>
        )}
      </div>
      {sheet === "howto" && <HowTo ex={ex} onChange={onChange} onClose={() => setSheet(null)} />}
      {sheet === "plates" && <PlateCalculator initialKg={target} onClose={() => setSheet(null)} />}
    </section>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button className={`block w-full px-4 py-3 text-left active:bg-muted ${danger ? "text-destructive" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function NumberInput({
  id,
  value,
  placeholder,
  decimal,
  onChange,
  label,
}: {
  id?: string;
  value: number | null;
  placeholder?: number | string | null;
  decimal?: boolean;
  onChange: (v: number | null) => void;
  label: string;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode={decimal ? "decimal" : "numeric"}
      step={decimal ? "0.5" : "1"}
      min={0}
      aria-label={label}
      className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-2 text-center text-base font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-primary"
      value={value ?? ""}
      placeholder={placeholder != null ? String(placeholder) : "–"}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        onChange(raw === "" ? null : Math.max(0, Number(raw)));
      }}
    />
  );
}
