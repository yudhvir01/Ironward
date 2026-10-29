import type { ExerciseDef, Muscle } from "./types";

// The extended library: ~870 exercises from Free Exercise DB (public
// domain), shipped as public/exercise-db.json and loaded only when needed
// — searching for an exercise, opening How-to on one outside the built-in
// 48, or importing a plan. Exercises from here get ids "db:<id>".

export interface DbEntry {
  i: string; // dataset id, also its image folder
  n: string;
  p: string[]; // primary muscles (dataset names)
  s: string[];
  m: "compound" | "isolation" | null;
  q: string | null; // equipment
  c: string; // category
  t: string[]; // instructions
}

export const DB_PREFIX = "db:";

// Where the dataset's photos are served from; cached after first view.
const IMAGE_BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";

let loading: Promise<DbEntry[]> | null = null;

export function loadExerciseDb(): Promise<DbEntry[]> {
  loading ??= fetch("/exercise-db.json")
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<DbEntry[]>;
    })
    .catch((e) => {
      loading = null; // let a later call retry (e.g. back online)
      throw e;
    });
  return loading;
}

// The dataset's muscle names, folded into Ironward's eleven.
const MUSCLE_MAP: Record<string, Muscle> = {
  quadriceps: "quads",
  shoulders: "shoulders",
  abdominals: "abs",
  chest: "chest",
  hamstrings: "hamstrings",
  triceps: "triceps",
  biceps: "biceps",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  neck: "back",
  calves: "calves",
  forearms: "biceps",
  glutes: "glutes",
  adductors: "quads",
  abductors: "glutes",
};

function toMuscle(names: string[]): Muscle | undefined {
  for (const n of names) if (MUSCLE_MAP[n]) return MUSCLE_MAP[n];
  return undefined;
}

export function toDef(e: DbEntry): ExerciseDef {
  let primary = toMuscle(e.p) ?? "chest";
  // The dataset files rear-delt work under "shoulders".
  if (primary === "shoulders" && /rear|reverse fly|face pull/i.test(e.n)) primary = "rear_delts";
  const secondary = [...new Set(e.s.map((m) => MUSCLE_MAP[m]).filter((m): m is Muscle => Boolean(m) && m !== primary))];
  return {
    id: DB_PREFIX + e.i,
    name: e.n,
    primary,
    secondary,
    kind: e.m === "isolation" ? "isolation" : "compound",
    barbell: e.q === "barbell" || undefined,
    bodyweight: e.q === "body only" || undefined,
  };
}

export function framesFor(e: DbEntry): [string, string] {
  return [`${IMAGE_BASE}${e.i}/0.jpg`, `${IMAGE_BASE}${e.i}/1.jpg`];
}

export function entryById(db: DbEntry[], exerciseId: string): DbEntry | undefined {
  if (!exerciseId.startsWith(DB_PREFIX)) return undefined;
  const id = exerciseId.slice(DB_PREFIX.length);
  return db.find((e) => e.i === id);
}

// ---------------------------------------------------------------------
// Name matching
// ---------------------------------------------------------------------

const SYNONYMS: Record<string, string> = {
  db: "dumbbell",
  dumbbells: "dumbbell",
  bb: "barbell",
  kb: "kettlebell",
  ez: "ezbar",
  "e-z": "ezbar",
  pullup: "pull up",
  pullups: "pull up",
  chinup: "chin up",
  chinups: "chin up",
  pushup: "push up",
  pushups: "push up",
  situp: "sit up",
  rdl: "romanian deadlift",
  ohp: "overhead press",
  tricep: "triceps",
  bicep: "biceps",
};

const FILLER = new Set(["the", "a", "with", "on", "and", "of", "to", "machine", "version", "medium", "grip", "-"]);

export function tokens(name: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/[()/,]/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .flatMap((w) => (SYNONYMS[w] ?? w).split(" "))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .filter((w) => !FILLER.has(w));
  return [...new Set(words)];
}

// How alike two names are, 0–1: shared words over all words, so "Zottman
// Curl" ≈ "Zottman Curl" but "Curl" alone doesn't match every curl.
function similarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  const shared = a.filter((w) => sb.has(w)).length;
  return shared / new Set([...a, ...b]).size;
}

export function searchDb(db: DbEntry[], query: string, limit = 20): DbEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const qt = tokens(q);
  return db
    .map((e) => {
      const name = e.n.toLowerCase();
      const score = name.includes(q) ? 2 + (name.startsWith(q) ? 1 : 0) : similarity(qt, tokens(e.n)) + (qt.every((w) => name.includes(w)) ? 1 : 0);
      return { e, score };
    })
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score || a.e.n.length - b.e.n.length)
    .slice(0, limit)
    .map((x) => x.e);
}

// A confident single match for an imported/typed name, or null. Strict on
// purpose: a wrong demo is worse than no demo.
export function bestDbMatch(db: DbEntry[], name: string): DbEntry | null {
  const t = tokens(name);
  if (!t.length) return null;
  let best: { e: DbEntry; score: number } | null = null;
  for (const e of db) {
    const et = tokens(e.n);
    let score = similarity(t, et);
    // "Arnold Press" vs "Arnold Dumbbell Press": every word given, plus at
    // most one more. Only for 2+ words, so "Curl" never grabs some curl.
    if (score < 0.75 && t.length >= 2 && t.every((w) => et.includes(w)) && et.length - t.length <= 1) score = 0.76;
    if (!best || score > best.score || (score === best.score && e.n.length < best.e.n.length)) best = { e, score };
  }
  return best && best.score >= 0.75 ? best.e : null;
}
