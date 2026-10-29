import { guessMuscle, matchExercise } from "./ai";
import { bestDbMatch, toDef, type DbEntry } from "./exerciseDb";
import { customExerciseId } from "./program";
import type { LoggedExercise, LoggedSet, Workout } from "./types";

// Reads a workout export from Strong or Hevy (CSV) into Ironward
// workouts. Both apps export one row per set; rows are grouped back into
// workouts by start time + name.

export type Source = "strong" | "hevy";

export interface ImportPreview {
  source: Source;
  workouts: Workout[];
  matched: number; // exercises found in the built-in library
  custom: string[]; // names added as the person's own exercises
  skippedRows: number;
}

const LB = 0.45359237;

export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // Strong: 2024-05-12 18:03:21
  const iso = new Date(s.replace(" ", "T"));
  if (!Number.isNaN(iso.getTime())) return iso;
  // Hevy: 12 May 2024, 18:03
  const loose = new Date(s.replace(",", ""));
  return Number.isNaN(loose.getTime()) ? null : loose;
}

// A stable id from the workout's start + name, shaped like a UUID, so
// importing the same file twice replaces rather than duplicates.
function stableId(key: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    h1 = Math.imul(h1 ^ key.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 ^ key.charCodeAt(i), 2246822507) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  // >>> 0 keeps every part unsigned; a negative would put "-" in the id.
  const a = hex(h1) + hex(h2) + hex((Math.imul(h1, 31) ^ h2) >>> 0) + hex((Math.imul(h2, 17) ^ h1) >>> 0);
  return `${a.slice(0, 8)}-${a.slice(8, 12)}-4${a.slice(13, 16)}-a${a.slice(17, 20)}-${a.slice(20, 32)}`;
}

function parseDuration(raw: string): number | null {
  // Strong: "1h 5m" / "45m" / seconds
  const h = Number(raw.match(/(\d+)\s*h/)?.[1] ?? 0);
  const m = Number(raw.match(/(\d+)\s*m/)?.[1] ?? 0);
  if (h || m) return (h * 60 + m) * 60000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n * 1000 : null;
}

interface Row {
  start: Date;
  end: Date | null;
  title: string;
  exercise: string;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  tag: LoggedSet["tag"];
  warmup: boolean;
  note: string;
}

// `strongUnit`: Strong doesn't say which unit its Weight column is in.
export function readExport(text: string, strongUnit: "kg" | "lb" = "kg", db?: DbEntry[]): ImportPreview {
  const table = parseCsv(text.replace(/^﻿/, ""));
  if (table.length < 2) throw new Error("That file is empty.");
  const head = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const isHevy = col("exercise_title") >= 0 && col("start_time") >= 0;
  const isStrong = col("exercise name") >= 0 && col("date") >= 0;
  if (!isHevy && !isStrong) throw new Error("This doesn't look like a Strong or Hevy export. Export a CSV from the app's settings and try again.");

  const rows: Row[] = [];
  let skipped = 0;
  for (const r of table.slice(1)) {
    const get = (name: string) => (col(name) >= 0 ? (r[col(name)] ?? "").trim() : "");
    let row: Row | null = null;
    if (isHevy) {
      const start = parseDate(get("start_time"));
      const kg = get("weight_kg") ? Number(get("weight_kg")) : get("weight_lbs") ? Number(get("weight_lbs")) * LB : null;
      const rpe = Number(get("rpe"));
      const type = get("set_type").toLowerCase();
      if (start)
        row = {
          start,
          end: parseDate(get("end_time")),
          title: get("title") || "Workout",
          exercise: get("exercise_title"),
          weightKg: kg && Number.isFinite(kg) ? kg : null,
          reps: get("reps") ? Number(get("reps")) : null,
          rir: rpe ? Math.max(0, Math.round(10 - rpe)) : null,
          tag: type === "failure" ? "failure" : type === "dropset" ? "drop" : undefined,
          warmup: type === "warmup",
          note: get("exercise_notes"),
        };
    } else {
      const start = parseDate(get("date"));
      const w = get("weight") ? Number(get("weight")) : null;
      const order = get("set order").toUpperCase();
      const rpe = Number(get("rpe"));
      const dur = parseDuration(get("duration"));
      if (start)
        row = {
          start,
          end: dur ? new Date(start.getTime() + dur) : null,
          title: get("workout name") || "Workout",
          exercise: get("exercise name"),
          weightKg: w && Number.isFinite(w) ? (strongUnit === "lb" ? w * LB : w) : null,
          reps: get("reps") ? Number(get("reps")) : null,
          rir: rpe ? Math.max(0, Math.round(10 - rpe)) : null,
          tag: order === "F" ? "failure" : order === "D" ? "drop" : undefined,
          warmup: order === "W",
          note: get("notes"),
        };
    }
    if (!row || !row.exercise || row.warmup || !row.reps || !Number.isFinite(row.reps)) {
      skipped++;
      continue;
    }
    rows.push(row);
  }
  if (!rows.length) throw new Error("No sets with reps were found in that file.");

  const byWorkout = new Map<string, Row[]>();
  for (const r of rows) {
    const key = `${r.start.toISOString()}|${r.title}`;
    byWorkout.set(key, [...(byWorkout.get(key) ?? []), r]);
  }

  let matched = 0;
  const custom = new Set<string>();
  const workouts: Workout[] = [];
  for (const [key, list] of byWorkout) {
    const exercises: LoggedExercise[] = [];
    for (const r of list) {
      const lookup = (name: string) => matchExercise(name) ?? (db ? (() => { const hit = bestDbMatch(db, name); return hit ? toDef(hit) : null; })() : null);
      let ex = exercises.find((e) => e.name === r.exercise || e.exerciseId === (lookup(r.exercise)?.id ?? customExerciseId(r.exercise)));
      if (!ex) {
        const def = lookup(r.exercise);
        if (def) matched++;
        else custom.add(r.exercise);
        const muscle = def?.primary ?? guessMuscle(null, r.exercise) ?? "chest";
        ex = {
          exerciseId: def?.id ?? customExerciseId(r.exercise),
          name: def?.name ?? r.exercise,
          primary: muscle,
          secondary: def?.secondary ?? [],
          kind: def?.kind ?? (["chest", "back", "quads", "hamstrings", "glutes"].includes(muscle) ? "compound" : "isolation"),
          bodyweight: def?.bodyweight,
          barbell: def?.barbell,
          repMin: r.reps!,
          repMax: r.reps!,
          note: r.note || undefined,
          sets: [],
        };
        exercises.push(ex);
      }
      ex.sets.push({ weight: r.weightKg ? Math.round(r.weightKg * 100) / 100 : null, reps: r.reps, rir: r.rir, done: true, ...(r.tag ? { tag: r.tag } : {}) });
      ex.repMin = Math.min(ex.repMin, r.reps!);
      ex.repMax = Math.max(ex.repMax, r.reps!);
    }
    const first = list[0];
    workouts.push({
      id: stableId(key),
      program_id: null,
      day_key: null,
      title: first.title,
      started_at: first.start.toISOString(),
      finished_at: (first.end ?? new Date(first.start.getTime() + 60 * 60000)).toISOString(),
      note: null,
      exercises,
    });
  }
  workouts.sort((a, b) => b.started_at.localeCompare(a.started_at));
  return { source: isHevy ? "hevy" : "strong", workouts, matched, custom: [...custom], skippedRows: skipped };
}
