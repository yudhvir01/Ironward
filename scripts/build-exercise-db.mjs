// Builds public/exercise-db.json — a slim copy of Free Exercise DB
// (public domain, github.com/yuhonas/free-exercise-db) — used to give
// exercises outside the built-in 48 a demo, steps and the right muscle.
//
//   node scripts/build-exercise-db.mjs path/to/exercises.json
//
// Download exercises.json from the repo's dist/ folder first.
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("Pass the path to free-exercise-db's dist/exercises.json");
const data = JSON.parse(readFileSync(src, "utf8"));
const slim = data.map((e) => ({
  i: e.id,
  n: e.name,
  p: e.primaryMuscles,
  s: e.secondaryMuscles,
  m: e.mechanic ?? null,
  q: e.equipment ?? null,
  c: e.category,
  t: e.instructions,
}));
writeFileSync(new URL("../public/exercise-db.json", import.meta.url), JSON.stringify(slim));
console.log(`Wrote ${slim.length} exercises to public/exercise-db.json`);
