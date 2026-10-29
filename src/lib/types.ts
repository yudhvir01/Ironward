export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs";

// Compound lifts get longer rest and a more conservative RIR target than
// isolation work (see the Guide page).
export type ExerciseKind = "compound" | "isolation";

export interface ExerciseDef {
  id: string;
  name: string;
  primary: Muscle;
  secondary?: Muscle[];
  kind: ExerciseKind;
  perSide?: boolean;
  // Loaded on an Olympic bar, so the plate calculator and warm-up ramp
  // start from the bar.
  barbell?: boolean;
  // Done with body weight; the weight box means *added* weight (a belt
  // or dumbbell) and progress is tracked in reps.
  bodyweight?: boolean;
}

// Marks a set as something other than a plain working set.
export type SetTag = "failure" | "drop";

export interface LoggedSet {
  weight: number | null;
  reps: number | null;
  // Reps in reserve. Optional — most people won't fill it in every set.
  rir: number | null;
  done: boolean;
  tag?: SetTag;
}

// Everything a report needs about an exercise is copied onto the log, so
// history stays readable even if the program or a custom exercise changes
// later.
export interface LoggedExercise {
  exerciseId: string;
  name: string;
  primary: Muscle;
  secondary: Muscle[];
  kind: ExerciseKind;
  repMin: number;
  repMax: number;
  sets: LoggedSet[];
  // The plan exercise this one fills, even after a swap — how a swap is
  // remembered for next time.
  slot?: string;
  // Exercises sharing a value are done back to back as a superset.
  superset?: string;
  // A note that's shown again next time ("seat on 4").
  note?: string;
  bodyweight?: boolean;
  barbell?: boolean;
}

export interface Workout {
  id: string;
  program_id: string | null;
  day_key: string | null;
  title: string;
  started_at: string;
  // Null only while a workout is still in progress (the local draft).
  finished_at: string | null;
  note: string | null;
  exercises: LoggedExercise[];
}

// Small numbers logged per day: protein eaten (g) and body measurements
// (stored in cm whatever unit is shown).
export type LogKind = "protein" | "waist" | "chest" | "arm" | "thigh" | "hips";

export interface DailyLog {
  id: string;
  day: string; // YYYY-MM-DD
  kind: LogKind;
  value: number;
  created_at: string;
}

export interface BodyWeight {
  id: string;
  day: string; // YYYY-MM-DD
  kg: number;
  created_at: string;
}
