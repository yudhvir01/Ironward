import type { Program } from "../program";
import type { BodyWeight, DailyLog, LogKind, Workout } from "../types";

export interface Backup {
  app: "ironward";
  version: 1;
  exportedAt: string;
  workouts: Workout[];
  bodyweights: BodyWeight[];
  // Added later; older backups don't have these.
  plans?: Program[];
  logs?: DailyLog[];
}

// The one seam every page and hook talks through. Pages never touch
// Drive or IndexedDB directly. A gym log is small (a few hundred
// workouts a year), so reports are computed client-side from the full
// lists rather than with per-backend queries.
export interface Backend {
  readonly kind: "guest" | "drive";

  // Finished workouts, newest first.
  listWorkouts(): Promise<Workout[]>;
  // Inserts or replaces by id.
  saveWorkout(workout: Workout): Promise<void>;
  deleteWorkout(id: string): Promise<void>;

  // Body-weight check-ins, newest day first.
  listBodyWeights(): Promise<BodyWeight[]>;
  addBodyWeight(input: { day: string; kg: number }): Promise<BodyWeight>;
  deleteBodyWeight(id: string): Promise<void>;

  // Protein and body measurements, newest first.
  listLogs(): Promise<DailyLog[]>;
  addLog(input: { day: string; kind: LogKind; value: number }): Promise<DailyLog>;
  deleteLog(id: string): Promise<void>;

  // Plans the person built or imported from AI. Built-in plans aren't
  // stored — they ship with the app.
  listPlans(): Promise<Program[]>;
  savePlan(plan: Program): Promise<void>;
  deletePlan(id: string): Promise<void>;

  // Removes everything this account stores (and the account itself, where
  // there is one). Signing out afterwards is the caller's job.
  deleteAccount(): Promise<void>;
}
