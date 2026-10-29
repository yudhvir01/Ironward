import type { ExerciseDef, Muscle } from "./types";
import type { Workout } from "./types";

// Small per-device settings and the in-progress workout. The draft lives
// here (not in the backend) so logging a set never waits on the network;
// it's saved to the backend once, when the workout is finished.

const DRAFT_KEY = "ironward.draft";
const PROGRAM_KEY = "ironward.program";
const REST_KEY = "ironward.restTimer";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the app still works for this visit.
  }
}

export function loadDraft(): Workout | null {
  const raw = read(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Workout;
  } catch {
    return null;
  }
}

export function saveDraft(workout: Workout | null) {
  write(DRAFT_KEY, workout ? JSON.stringify(workout) : null);
}

export function loadProgramId(): string | null {
  return read(PROGRAM_KEY);
}

export function saveProgramId(id: string) {
  write(PROGRAM_KEY, id);
}

export function restTimerEnabled(): boolean {
  return read(REST_KEY) !== "off";
}

export function setRestTimerEnabled(on: boolean) {
  write(REST_KEY, on ? null : "off");
}

const BAR_KEY = "ironward.barKg";
const REST_ENDS_KEY = "ironward.restEndsAt";

// The bar's weight in the display unit (20 kg / 45 lb unless changed).
export function loadBar(unit: "kg" | "lb"): number {
  const raw = read(`${BAR_KEY}.${unit}`) ?? (unit === "kg" ? read(BAR_KEY) : null);
  const n = Number(raw);
  return raw !== null && Number.isFinite(n) && n >= 0 ? n : unit === "kg" ? 20 : 45;
}

export function saveBar(unit: "kg" | "lb", value: number) {
  write(`${BAR_KEY}.${unit}`, String(value));
}

export interface RestState {
  endsAt: number;
  startedAt: number;
  exerciseId: string | null;
}

// Kept so leaving the workout screen and coming back doesn't lose the
// countdown.
export function loadRest(): RestState | null {
  try {
    const v = JSON.parse(read(REST_ENDS_KEY) ?? "null") as RestState | null;
    return v && v.endsAt > Date.now() ? v : null;
  } catch {
    return null;
  }
}

export function saveRest(v: RestState | null) {
  write(REST_ENDS_KEY, v ? JSON.stringify(v) : null);
}

const REST_SECONDS_KEY = "ironward.restSeconds";
export const REST_CHOICES = [30, 45, 60, 90, 120] as const;

// One rest length for every exercise; ±15 s on the timer adjusts a
// single rest.
export function loadRestSeconds(): number {
  const n = Number(read(REST_SECONDS_KEY));
  return n > 0 ? n : 30;
}

export function saveRestSeconds(seconds: number) {
  write(REST_SECONDS_KEY, String(seconds));
}

// Which warm-up steps are ticked, per workout; cleared with the draft.
export function loadWarmupTicks(workoutId: string): string[] {
  try {
    return JSON.parse(read(`ironward.warmup.${workoutId}`) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function saveWarmupTicks(workoutId: string, ticks: string[] | null) {
  write(`ironward.warmup.${workoutId}`, ticks ? JSON.stringify(ticks) : null);
}

// ---------------------------------------------------------------------
// Smallest weight jump the gym allows (in the display unit's kg).
// ---------------------------------------------------------------------
const STEP_KEY = "ironward.stepKg";
export const STEP_CHOICES_KG = [1, 1.25, 2, 2.5, 5] as const;

export function loadStepKg(): number {
  const n = Number(read(STEP_KEY));
  return n > 0 ? n : 2.5;
}

export function saveStepKg(kg: number) {
  write(STEP_KEY, String(kg));
}

// ---------------------------------------------------------------------
// Per-plan-day memory: swaps and supersets made during a workout that
// should apply next time too. Keyed by plan + day, then by the plan
// exercise ("slot") they replace.
// ---------------------------------------------------------------------
export interface DayOverrides {
  swaps: Record<string, ExerciseDef>;
  supersets: string[]; // slots that are supersetted with the next exercise
}

function overridesKey(programId: string, dayKey: string) {
  return `ironward.day.${programId}.${dayKey}`;
}

export function loadOverrides(programId: string | null, dayKey: string | null): DayOverrides {
  if (!programId || !dayKey) return { swaps: {}, supersets: [] };
  try {
    const v = JSON.parse(read(overridesKey(programId, dayKey)) ?? "null") as DayOverrides | null;
    return { swaps: v?.swaps ?? {}, supersets: v?.supersets ?? [] };
  } catch {
    return { swaps: {}, supersets: [] };
  }
}

export function saveOverrides(programId: string | null, dayKey: string | null, v: DayOverrides) {
  if (!programId || !dayKey) return;
  write(overridesKey(programId, dayKey), JSON.stringify(v));
}

// ---------------------------------------------------------------------
// Rest per exercise: if ±15 was used, that length is kept for next time.
// ---------------------------------------------------------------------
const REST_BY_EX_KEY = "ironward.restByExercise";

export function loadExerciseRest(exerciseId: string): number | null {
  try {
    const map = JSON.parse(read(REST_BY_EX_KEY) ?? "{}") as Record<string, number>;
    return map[exerciseId] ?? null;
  } catch {
    return null;
  }
}

export function saveExerciseRest(exerciseId: string, seconds: number) {
  try {
    const map = JSON.parse(read(REST_BY_EX_KEY) ?? "{}") as Record<string, number>;
    map[exerciseId] = seconds;
    write(REST_BY_EX_KEY, JSON.stringify(map));
  } catch {
    // Not worth failing a set over.
  }
}

// ---------------------------------------------------------------------
// Deload week: fewer sets, lighter weights, until the date passes.
// ---------------------------------------------------------------------
const DELOAD_KEY = "ironward.deloadUntil";

export function deloadActive(): boolean {
  return Number(read(DELOAD_KEY)) > Date.now();
}

export function startDeload(days = 7) {
  write(DELOAD_KEY, String(Date.now() + days * 86400000));
}

export function endDeload() {
  write(DELOAD_KEY, null);
}

// ---------------------------------------------------------------------
// First-run setup and reminders
// ---------------------------------------------------------------------
const ONBOARDED_KEY = "ironward.onboarded";

export function isOnboarded(): boolean {
  return read(ONBOARDED_KEY) === "1";
}

export function setOnboarded() {
  write(ONBOARDED_KEY, "1");
}

export interface ReminderSettings {
  on: boolean;
  days: number[]; // 1 = Monday … 7 = Sunday
  hour: number;
  minute: number;
}

const REMINDER_KEY = "ironward.reminder";

export function loadReminder(): ReminderSettings {
  try {
    const v = JSON.parse(read(REMINDER_KEY) ?? "null") as ReminderSettings | null;
    if (v) return v;
  } catch {
    // fall through
  }
  return { on: false, days: [1, 2, 3, 4, 5, 6], hour: 18, minute: 0 };
}

export function saveReminder(v: ReminderSettings) {
  write(REMINDER_KEY, JSON.stringify(v));
}

// ---------------------------------------------------------------------
// Exercise notes, also kept here so a note survives even when the
// exercise is skipped that day (skipped exercises aren't saved).
// ---------------------------------------------------------------------
const NOTES_KEY = "ironward.exerciseNotes";

export function loadExerciseNote(exerciseId: string): string | undefined {
  try {
    return (JSON.parse(read(NOTES_KEY) ?? "{}") as Record<string, string>)[exerciseId] || undefined;
  } catch {
    return undefined;
  }
}

export function saveExerciseNote(exerciseId: string, note: string) {
  try {
    const map = JSON.parse(read(NOTES_KEY) ?? "{}") as Record<string, string>;
    if (note) map[exerciseId] = note;
    else delete map[exerciseId];
    write(NOTES_KEY, JSON.stringify(map));
  } catch {
    // The note still lives on today's workout.
  }
}

// ---------------------------------------------------------------------
// Muscle corrections for exercises outside the library, so the reports
// count them right from then on.
// ---------------------------------------------------------------------
const MUSCLE_FIX_KEY = "ironward.muscleFix";

export function loadMuscleFix(exerciseId: string): Muscle | undefined {
  try {
    return (JSON.parse(read(MUSCLE_FIX_KEY) ?? "{}") as Record<string, Muscle>)[exerciseId];
  } catch {
    return undefined;
  }
}

export function saveMuscleFix(exerciseId: string, muscle: Muscle) {
  try {
    const map = JSON.parse(read(MUSCLE_FIX_KEY) ?? "{}") as Record<string, Muscle>;
    map[exerciseId] = muscle;
    write(MUSCLE_FIX_KEY, JSON.stringify(map));
  } catch {
    // The fix still applies to today's workout.
  }
}
