import { defFor, type PlanDay, type Program } from "./program";
import type { ExerciseDef, LoggedExercise, LoggedSet, Muscle, Workout } from "./types";
import { fmtWeight, getUnit, toUnit } from "./units";

// ---------------------------------------------------------------------
// Dates — everything is bucketed by the person's local calendar day.
// ---------------------------------------------------------------------

export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayOf(iso: string): string {
  return localDay(new Date(iso));
}

// Monday 00:00 of the week `date` falls in.
export function weekStart(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ---------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------

export function isCounted(set: LoggedSet): set is LoggedSet & { reps: number } {
  return set.done && set.reps !== null && set.reps > 0;
}

// Epley's estimate. It gets unreliable past ~12 reps, which is fine for a
// trend line but is why PRs also track the plain heaviest weight.
export function e1rm(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export function bestE1rm(ex: LoggedExercise): number {
  let best = 0;
  for (const s of ex.sets) {
    if (isCounted(s) && s.weight) best = Math.max(best, e1rm(s.weight, s.reps));
  }
  return best;
}

export function heaviest(ex: LoggedExercise): number {
  let best = 0;
  for (const s of ex.sets) if (isCounted(s) && s.weight) best = Math.max(best, s.weight);
  return best;
}

export function exerciseVolume(ex: LoggedExercise): number {
  return ex.sets.reduce((sum, s) => (isCounted(s) ? sum + (s.weight ?? 0) * s.reps : sum), 0);
}

export function workoutVolume(w: Workout): number {
  return w.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((sum, ex) => sum + ex.sets.filter(isCounted).length, 0);
}

export function durationMinutes(w: Workout): number | null {
  if (!w.finished_at) return null;
  return Math.max(1, Math.round((Date.parse(w.finished_at) - Date.parse(w.started_at)) / 60000));
}

// ---------------------------------------------------------------------
// What to lift today
// ---------------------------------------------------------------------

// The most recent time this exercise was logged with at least one set.
export function lastPerformance(workouts: Workout[], exerciseId: string, excludeId?: string): LoggedExercise | null {
  for (const w of workouts) {
    if (w.id === excludeId) continue;
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some(isCounted));
    if (ex) return ex;
  }
  return null;
}

export interface Suggestion {
  // Per-set placeholders shown in the inputs; ticking a set with empty
  // inputs takes these values.
  sets: { weight: number | null; reps: number | null }[];
  message: string;
  tone: "new" | "up" | "same" | "deload";
}

// No set carried any weight: a bodyweight exercise done plain, so it's
// judged on reps.
export function isRepsOnly(ex: LoggedExercise): boolean {
  return !ex.sets.some((s) => isCounted(s) && (s.weight ?? 0) > 0);
}

export function maxReps(ex: LoggedExercise): number {
  return Math.max(0, ...ex.sets.filter(isCounted).map((s) => s.reps));
}

// One number per session to compare: estimated 1RM when weight was used,
// otherwise the best set's reps.
export function score(ex: LoggedExercise): number {
  return isRepsOnly(ex) ? maxReps(ex) : bestE1rm(ex);
}

const roundToStep = (n: number, step: number) => Math.round(n / step) * step;

export interface SuggestOptions {
  stepKg?: number;
  deload?: boolean;
}

// Double progression, straight from the plan: add reps inside the range;
// once every set hits the top of it, add the smallest jump the gym has.
export function suggest(ex: LoggedExercise, last: LoggedExercise | null, opts: SuggestOptions = {}): Suggestion {
  const count = ex.sets.length;
  const step = opts.stepKg ?? 2.5;
  const blank = () => Array.from({ length: count }, () => ({ weight: null, reps: null }));
  if (!last) {
    return {
      sets: blank(),
      message: ex.bodyweight
        ? `Bodyweight — aim for ${repRangeText(ex)} clean reps. Add weight once that's easy.`
        : `New lift — pick a weight you can do for ${repRangeText(ex)} reps with 2–3 left in the tank.`,
      tone: "new",
    };
  }
  const done = last.sets.filter(isCounted);
  const repsLine = done.map((s) => s.reps).join(", ");
  const allAtTop = done.length >= Math.min(count, last.sets.length) && done.every((s) => s.reps >= ex.repMax);

  if (isRepsOnly(last)) {
    if (opts.deload) {
      return { sets: Array.from({ length: count }, () => ({ weight: null, reps: ex.repMin })), message: `Deload week: easy sets of ${ex.repMin}, nowhere near failure.`, tone: "deload" };
    }
    if (allAtTop) {
      return {
        sets: Array.from({ length: count }, () => ({ weight: null, reps: ex.repMax })),
        message: `You hit ${ex.repMax}+ on every set last time — add a little weight (belt or dumbbell), or slow the lowering to 3 s.`,
        tone: "up",
      };
    }
    return {
      sets: Array.from({ length: count }, (_, i) => {
        const prev = done[i] ?? done[done.length - 1];
        return { weight: null, reps: prev ? Math.min(ex.repMax, prev.reps + 1) : ex.repMin };
      }),
      message: `Last time: ${repsLine} reps. Try to beat it by a rep.`,
      tone: "same",
    };
  }

  const topWeight = Math.max(0, ...done.map((s) => s.weight ?? 0));
  if (opts.deload) {
    const light = Math.max(step, roundToStep(topWeight * 0.9, step));
    return {
      sets: Array.from({ length: count }, () => ({ weight: light, reps: ex.repMin })),
      message: `Deload week: ${fmtKg(light)} (≈90%) for easy sets of ${ex.repMin}. Recover, then push again.`,
      tone: "deload",
    };
  }
  if (allAtTop) {
    const next = round1(topWeight + step);
    return {
      sets: Array.from({ length: count }, () => ({ weight: next, reps: ex.repMin })),
      message: `You hit ${ex.repMax} on every set last time — go up to ${fmtKg(next)} and aim for ${ex.repMin}+.`,
      tone: "up",
    };
  }
  const sets = Array.from({ length: count }, (_, i) => {
    const prev = done[i] ?? done[done.length - 1];
    return { weight: prev?.weight ?? null, reps: prev ? Math.min(ex.repMax, prev.reps + 1) : ex.repMin };
  });
  return {
    sets,
    message: `Last time: ${fmtKg(topWeight)} × ${repsLine}. Same weight, try to beat it by a rep.`,
    tone: "same",
  };
}

function repRangeText(ex: { repMin: number; repMax: number }) {
  return ex.repMin === ex.repMax ? String(ex.repMin) : `${ex.repMin}–${ex.repMax}`;
}

// The plan rule: if you miss a day, resume the sequence — never cram.
export function nextPlanDay(program: Program, workouts: Workout[]): PlanDay {
  const last = workouts.find((w) => w.program_id === program.id && w.day_key);
  if (!last) return program.days[0];
  const i = program.days.findIndex((d) => d.key === last.day_key);
  return program.days[(i + 1) % program.days.length];
}

export interface StartOptions {
  // Swaps and supersets remembered from earlier sessions of this day.
  swaps?: Record<string, ExerciseDef>;
  supersets?: string[];
  // Deload week: half the sets (at least one).
  deload?: boolean;
}

export function startWorkout(program: Program | null, day: PlanDay | null, opts: StartOptions = {}): Workout {
  const plan = day?.exercises ?? [];
  // Superset groups: an exercise flagged "with next" shares a group with
  // the one after it; chains keep the same group.
  const linked = plan.map((p) => Boolean(p.superset) || (opts.supersets ?? []).includes(p.exerciseId));
  const groups: (string | undefined)[] = [];
  let letter = 0;
  plan.forEach((_, i) => {
    if (i > 0 && linked[i - 1]) groups[i] = groups[i - 1];
    else if (linked[i]) groups[i] = String.fromCharCode(65 + letter++);
  });

  return {
    id: crypto.randomUUID(),
    program_id: program?.id ?? null,
    day_key: day?.key ?? null,
    title: day?.name ?? "Workout",
    started_at: new Date().toISOString(),
    finished_at: null,
    note: null,
    exercises: plan.map((p, i) => {
      const def = opts.swaps?.[p.exerciseId] ?? defFor(p);
      const sets = opts.deload ? Math.max(1, Math.ceil(p.sets / 2)) : p.sets;
      return {
        exerciseId: def.id,
        name: def.name,
        primary: def.primary,
        secondary: def.secondary ?? [],
        kind: def.kind,
        bodyweight: def.bodyweight,
        barbell: def.barbell,
        repMin: p.repMin,
        repMax: p.repMax,
        slot: p.exerciseId,
        superset: groups[i],
        sets: Array.from({ length: sets }, () => ({ weight: null, reps: null, rir: null, done: false })),
      };
    }),
  };
}

// ---------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------

// A set counts fully for its main muscle and half for helpers — the
// usual way volume per muscle is tallied in hypertrophy research.
export function muscleSets(workouts: Workout[], from: Date, to: Date): Record<Muscle, number> {
  const out = {} as Record<Muscle, number>;
  for (const w of workouts) {
    const t = Date.parse(w.started_at);
    if (t < from.getTime() || t >= to.getTime()) continue;
    for (const ex of w.exercises) {
      const n = ex.sets.filter(isCounted).length;
      if (!n) continue;
      out[ex.primary] = (out[ex.primary] ?? 0) + n;
      for (const m of ex.secondary) out[m] = (out[m] ?? 0) + n / 2;
    }
  }
  return out;
}

export function thisWeek(): { from: Date; to: Date } {
  const from = weekStart();
  return { from, to: addDays(from, 7) };
}

export interface WeekBucket {
  start: Date;
  workouts: number;
  sets: number;
  volume: number;
}

export function weeklyBuckets(workouts: Workout[], weeks: number): WeekBucket[] {
  const current = weekStart();
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => ({
    start: addDays(current, -7 * (weeks - 1 - i)),
    workouts: 0,
    sets: 0,
    volume: 0,
  }));
  const first = buckets[0].start.getTime();
  for (const w of workouts) {
    const t = Date.parse(w.started_at);
    if (t < first) continue;
    const idx = Math.floor((weekStart(new Date(t)).getTime() - first) / (7 * 86400000) + 0.01);
    const b = buckets[idx];
    if (!b) continue;
    b.workouts += 1;
    b.sets += workoutSetCount(w);
    b.volume += workoutVolume(w);
  }
  return buckets;
}

export interface ExercisePoint {
  workoutId: string;
  day: string;
  e1rm: number;
  heaviest: number;
  reps: number; // best single set's reps
  // e1rm for weighted work, best reps for plain bodyweight work.
  score: number;
  repsOnly: boolean;
  topSet: string;
}

// Oldest first, one point per workout.
export function exerciseHistory(workouts: Workout[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId || !ex.sets.some(isCounted)) continue;
      const repsOnly = isRepsOnly(ex);
      const counted = ex.sets.filter(isCounted);
      const top = repsOnly
        ? counted.reduce((a, b) => (b.reps > a.reps ? b : a))
        : counted.reduce((a, b) => (e1rm(b.weight ?? 0, b.reps) > e1rm(a.weight ?? 0, a.reps) ? b : a));
      points.push({
        workoutId: w.id,
        day: dayOf(w.started_at),
        e1rm: bestE1rm(ex),
        heaviest: heaviest(ex),
        reps: maxReps(ex),
        score: score(ex),
        repsOnly,
        topSet: repsOnly ? `${top.reps} reps` : `${fmtKg(top.weight ?? 0)} × ${top.reps}`,
      });
    }
  }
  return points.reverse();
}

// Every exercise someone has logged, most-logged first.
export function loggedExercises(workouts: Workout[]): { id: string; name: string; count: number }[] {
  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (!ex.sets.some(isCounted)) continue;
      const entry = map.get(ex.exerciseId) ?? { id: ex.exerciseId, name: ex.name, count: 0 };
      entry.count += 1;
      map.set(ex.exerciseId, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export interface PR {
  exercise: string;
  label: string;
}

// Records `workout` set compared with everything logged before it.
export function prsIn(workout: Workout, all: Workout[]): PR[] {
  const before = all.filter((w) => w.id !== workout.id && w.started_at < workout.started_at);
  const prs: PR[] = [];
  for (const ex of workout.exercises) {
    const prior = before.flatMap((w) => w.exercises.filter((e) => e.exerciseId === ex.exerciseId));
    if (!prior.length) continue; // a first time isn't a record yet
    if (isRepsOnly(ex)) {
      const bestBefore = Math.max(0, ...prior.map(maxReps));
      if (maxReps(ex) > bestBefore && bestBefore > 0) prs.push({ exercise: ex.name, label: `Most reps: ${maxReps(ex)}` });
      continue;
    }
    const bestBefore = Math.max(0, ...prior.map(bestE1rm));
    const heavyBefore = Math.max(0, ...prior.map(heaviest));
    const nowBest = bestE1rm(ex);
    const nowHeavy = heaviest(ex);
    if (nowHeavy > heavyBefore && heavyBefore > 0) prs.push({ exercise: ex.name, label: `Heaviest: ${fmtKg(nowHeavy)}` });
    else if (nowBest > bestBefore && bestBefore > 0) prs.push({ exercise: ex.name, label: `Best set (est. 1RM ${fmtKg(round1(nowBest))})` });
  }
  return prs;
}

// Lifts whose last three sessions all failed to beat the best estimate
// from before them — the "performance declining" signal the plan says to
// act on.
export function stalledLifts(workouts: Workout[]): { id: string; name: string; sessions: number }[] {
  const out: { id: string; name: string; sessions: number }[] = [];
  const recentCutoff = Date.now() - 21 * 86400000;
  for (const { id, name } of loggedExercises(workouts)) {
    const hist = exerciseHistory(workouts, id);
    if (hist.length < 4) continue;
    const lastThree = hist.slice(-3);
    if (Date.parse(lastThree[2].day) < recentCutoff) continue;
    const before = Math.max(...hist.slice(0, -3).map((p) => p.score));
    if (lastThree.every((p) => p.score <= before)) out.push({ id, name, sessions: 3 });
  }
  return out;
}

export interface BlockPhase {
  week: number;
  title: string;
  advice: string;
}

// Where someone is in the plan's first-8-weeks ramp, counted from their
// first logged workout.
export function blockPhase(workouts: Workout[]): BlockPhase | null {
  if (!workouts.length) return null;
  const first = weekStart(new Date(workouts[workouts.length - 1].started_at));
  const week = Math.floor((weekStart().getTime() - first.getTime()) / (7 * 86400000) + 0.01) + 1;
  if (week <= 2) return { week, title: "Learn the plan", advice: "Settle on working weights. Leave 2–3 reps in reserve on most sets." };
  if (week <= 4) return { week, title: "Start progressing", advice: "Add reps, then weight, while technique stays clean." };
  if (week <= 6) return { week, title: "Keep progressing", advice: "Add sets only if recovery is good and progress has stalled." };
  if (week <= 8) return { week, title: "Review", advice: "Check strength, body weight and fatigue. Adjust volume if needed." };
  return { week, title: "Keep building", advice: "Same rules: beat last time, recover, review every 8 weeks." };
}

// ---------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Weights are stored in kg and shown in the chosen unit.
export function fmtKg(n: number): string {
  return fmtWeight(n);
}

export function fmtVolume(n: number): string {
  const v = toUnit(n);
  if (getUnit() === "lb") return v >= 10000 ? `${round1(v / 1000)}k lb` : `${Math.round(v)} lb`;
  return v >= 10000 ? `${round1(v / 1000)} t` : `${Math.round(v)} kg`;
}

export function fmtDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}
