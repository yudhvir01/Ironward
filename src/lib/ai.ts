import { EXERCISE_LIST, MUSCLES, customExerciseId, type PlanExercise, type Program } from "./program";
import { exerciseHistory, fmtKg, loggedExercises, muscleSets, round1, weekStart, workoutSetCount } from "./stats";
import { bestDbMatch, toDef, type DbEntry } from "./exerciseDb";
import type { BodyWeight, ExerciseDef, Muscle, Workout } from "./types";

// "Bring your own AI": the app writes a prompt, the person pastes it into
// ChatGPT / Claude / Gemini, and pastes the answer back. No API key, no
// server, works with whichever assistant they already use. The answer
// format is plain JSON so it parses the same whatever wrote it.

export interface PlanAnswers {
  goal: string;
  daysPerWeek: number;
  minutes: number;
  experience: string;
  equipment: string;
  focus: string;
  limits: string;
}

const FORMAT = `Reply with ONLY one JSON code block in exactly this shape (no other text before or after it):

\`\`\`json
{
  "name": "Short plan name",
  "description": "One sentence on who it's for and the weekly schedule",
  "days": [
    {
      "name": "Push A",
      "focus": "Chest · Shoulders · Triceps",
      "exercises": [
        { "name": "Barbell bench press", "muscle": "chest", "type": "compound", "sets": 3, "reps": "6-8", "tip": "One short form cue" }
      ]
    }
  ]
}
\`\`\`

Rules for the JSON:
- "days" lists the distinct sessions in the order they are done; the app repeats them in sequence.
- "muscle" is the main muscle, one of: ${MUSCLES.join(", ")}.
- "type" is "compound" or "isolation".
- "reps" is a range like "8-12" (use the low end for the heaviest lifts).
- Prefer exercise names from this list so my existing history carries over (use a different name only when none fits):
${EXERCISE_LIST.map((e) => e.name).join("; ")}.`;

export function buildPlanPrompt(a: PlanAnswers, history: Workout[]): string {
  const lifts = loggedExercises(history)
    .slice(0, 8)
    .map(({ id, name }) => {
      const h = exerciseHistory(history, id);
      const last = h[h.length - 1];
      return last ? `- ${name}: recent best set ${last.topSet}` : null;
    })
    .filter(Boolean);

  return `You are an evidence-based strength coach. Design a weekly gym program for me.

About me:
- Goal: ${a.goal}
- Training days per week: ${a.daysPerWeek}
- Time per session: about ${a.minutes} minutes
- Experience: ${a.experience}
- Equipment: ${a.equipment}
${a.focus.trim() ? `- Priorities / weak points: ${a.focus.trim()}\n` : ""}${a.limits.trim() ? `- Injuries or things to avoid: ${a.limits.trim()}\n` : ""}${lifts.length ? `\nMy current lifts (from my log):\n${lifts.join("\n")}\n` : ""}
Program design guidelines:
- Train each major muscle about twice a week, roughly 10–20 hard sets per muscle per week.
- Use double progression (add reps within the range, then add weight).
- Big compound lifts 2–3 reps in reserve, isolation work 1–2.
- Keep each session to the time I have; fewer, better exercises beat long lists.
- Include direct work for side delts, calves and abs.

${FORMAT}`;
}

export function buildReviewPrompt(workouts: Workout[], bodyweights: BodyWeight[], program: Program): string {
  const since = Date.now() - 28 * 86400000;
  const recent = workouts.filter((w) => Date.parse(w.started_at) >= since);
  const from = weekStart();
  from.setDate(from.getDate() - 21);
  const to = new Date(weekStart());
  to.setDate(to.getDate() + 7);
  const perMuscle = muscleSets(workouts, from, to);

  const lifts = loggedExercises(recent).map(({ id, name }) => {
    const h = exerciseHistory(workouts, id).filter((p) => Date.parse(p.day) >= since);
    if (!h.length) return null;
    const first = h[0];
    const last = h[h.length - 1];
    const change = first.e1rm ? Math.round(((last.e1rm - first.e1rm) / first.e1rm) * 100) : 0;
    return `- ${name}: ${h.length} sessions, ${first.topSet} → ${last.topSet} (est. 1RM ${change >= 0 ? "+" : ""}${change}%)`;
  });

  const weights = [...bodyweights].reverse().filter((b) => Date.parse(b.day) >= since - 7 * 86400000);
  const bw =
    weights.length >= 2
      ? `${fmtKg(weights[0].kg)} → ${fmtKg(weights[weights.length - 1].kg)} over ${weights.length} weigh-ins`
      : weights.length === 1
        ? fmtKg(weights[0].kg)
        : "not logged";

  const plan = program.days
    .map((d) => `- ${d.name}: ${d.exercises.map((e) => `${(e.custom?.name ?? EXERCISE_LIST.find((x) => x.id === e.exerciseId)?.name) || e.exerciseId} ${e.sets}×${e.repMin}-${e.repMax}`).join(", ")}`)
    .join("\n");

  return `You are an evidence-based strength coach. Review my last 4 weeks of training and tell me what to change.

My plan (${program.name}, ${program.daysPerWeek} days/week):
${plan}

Last 4 weeks: ${recent.length} workouts, ${recent.reduce((n, w) => n + workoutSetCount(w), 0)} hard sets.

Lifts (first → latest best set in the period):
${lifts.filter(Boolean).join("\n") || "- none logged"}

Average weekly hard sets per muscle (helper muscles count half):
${MUSCLES.map((m) => `- ${m}: ${round1((perMuscle[m as Muscle] ?? 0) / 4)}`).join("\n")}

Body weight: ${bw}

Please give me:
1. What's working (2–3 bullets).
2. What's stalling or out of balance, with the likely reason.
3. Specific changes for the next 4 weeks (exercises, sets, rep ranges, deload or not).
4. Then, if you recommend plan changes, the full updated plan in this format so I can import it:

${FORMAT}`;
}

// ---------------------------------------------------------------------
// Reading the answer back
// ---------------------------------------------------------------------

export interface ParsedPlan {
  program: Program;
  warnings: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const BY_NAME = new Map<string, ExerciseDef>();
for (const e of EXERCISE_LIST) {
  BY_NAME.set(norm(e.name), e);
  BY_NAME.set(norm(e.id), e);
}

// Common names from other apps (Strong, Hevy) that don't match ours word
// for word. Keys are normalised.
const ALIASES: Record<string, string> = {
  "barbell squat": "back_squat",
  "squat": "back_squat",
  "barbell bench press": "bench_press",
  "bench press": "bench_press",
  "dumbbell bench press": "flat_db_press",
  "incline bench press dumbbell": "incline_db_press",
  "dumbbell incline bench press": "incline_db_press",
  "cable lat pulldown": "lat_pulldown",
  "lat pulldown cable": "lat_pulldown",
  "machine lat pulldown": "lat_pulldown",
  "pull up": "pull_ups",
  "chin up": "pull_ups",
  "seated row": "seated_cable_row",
  "cable seated row": "seated_cable_row",
  "barbell bent over row": "barbell_row",
  "bent over row": "barbell_row",
  "dumbbell row": "one_arm_db_row",
  "dumbbell lateral raise": "db_lateral_raise",
  "cable lateral raise": "cable_lateral_raise",
  "dumbbell shoulder press": "db_shoulder_press",
  "machine shoulder press": "machine_shoulder_press",
  "barbell romanian deadlift": "rdl",
  "romanian deadlift": "rdl",
  "dumbbell romanian deadlift": "db_rdl",
  "machine leg press": "leg_press",
  "leg press machine": "leg_press",
  "machine leg extension": "leg_extension",
  "machine seated leg curl": "seated_leg_curl",
  "machine lying leg curl": "lying_leg_curl",
  "barbell hip thrust": "hip_thrust",
  "machine standing calf raise": "standing_calf_raise",
  "machine seated calf raise": "seated_calf_raise",
  "cable triceps pushdown": "cable_pushdown",
  "triceps pushdown": "cable_pushdown",
  "cable triceps rope pushdown": "rope_pushdown",
  "dumbbell hammer curl": "hammer_curl",
  "dumbbell incline curl": "incline_db_curl",
  "barbell biceps curl": "barbell_curl",
  "ez bar preacher curl": "ez_preacher_curl",
  "machine chest fly": "pec_deck",
  "cable chest fly": "cable_fly",
  "cable crossover": "cable_fly",
  "machine reverse fly": "reverse_pec_deck",
  "cable face pull": "face_pull",
  "hanging knee raise": "hanging_knee_raise",
  "push up": "push_ups",
  "dip": "dips",
};

export function matchExercise(name: string): ExerciseDef | null {
  const n = norm(name);
  const exact = BY_NAME.get(n);
  if (exact) return exact;
  // "Bench Press (Barbell)" → "barbell bench press"
  const paren = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const candidates = [n, paren ? norm(`${paren[2]} ${paren[1]}`) : "", paren ? norm(`${paren[1]} ${paren[2]}`) : ""].filter(Boolean);
  for (const c of candidates) {
    const hit = BY_NAME.get(c) ?? (ALIASES[c] ? EXERCISE_LIST.find((e) => e.id === ALIASES[c]) : undefined) ?? (ALIASES[c.replace(/s\b/g, "")] ? EXERCISE_LIST.find((e) => e.id === ALIASES[c.replace(/s\b/g, "")]) : undefined);
    if (hit) return hit;
  }
  // "DB lateral raises" vs "Dumbbell lateral raise": plural and short forms.
  const loose = n.replace(/\bdb\b/g, "dumbbell").replace(/\bbb\b/g, "barbell").replace(/s\b/g, "");
  for (const e of EXERCISE_LIST) {
    if (norm(e.name).replace(/s\b/g, "") === loose) return e;
  }
  return null;
}

// When the AI names a muscle outside the list ("forearms", "lats"), guess
// from the exercise name before giving up.
const NAME_HINTS: [RegExp, Muscle][] = [
  // Most specific first: "leg curl" is hamstrings, not biceps.
  [/(leg curl|nordic|rdl|romanian|good morning)/, "hamstrings"],
  [/(squat|lunge|leg press|leg extension|step up)/, "quads"],
  [/(hip thrust|glute|bridge)/, "glutes"],
  [/calf/, "calves"],
  [/(rear delt|face pull|reverse fly)/, "rear_delts"],
  [/curl/, "biceps"],
  [/(pushdown|extension|skull|tricep|kickback|dip)/, "triceps"],
  [/(lateral|shoulder|overhead press|military|arnold)/, "shoulders"],
  [/(row|pull ?up|chin|pulldown|lat|deadlift)/, "back"],
  [/(crunch|plank|ab |abs|raise|sit up|rollout)/, "abs"],
  [/(bench|chest|fly|push ?up|pec)/, "chest"],
];

export function guessMuscle(given: unknown, name: string): Muscle | null {
  const g = String(given ?? "").toLowerCase().replace(/\s+/g, "_");
  if ((MUSCLES as string[]).includes(g)) return g as Muscle;
  const aliases: Record<string, Muscle> = { lats: "back", upper_back: "back", traps: "back", delts: "shoulders", side_delts: "shoulders", hams: "hamstrings", quadriceps: "quads", core: "abs", forearms: "biceps", pecs: "chest" };
  if (aliases[g]) return aliases[g];
  const n = name.toLowerCase();
  return NAME_HINTS.find(([re]) => re.test(n))?.[1] ?? null;
}

function parseReps(raw: unknown): [number, number] | null {
  if (typeof raw === "number" && raw > 0) return [raw, raw];
  if (typeof raw !== "string") return null;
  const nums = raw.match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  const lo = Math.min(...nums.slice(0, 2));
  const hi = Math.max(...nums.slice(0, 2));
  return [lo, hi];
}

// Pulls the JSON out of whatever was pasted — a bare object, a fenced
// code block, or a whole chat answer with prose around it.
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Couldn't find a plan in that text. Paste the AI's whole answer, including the ```json block.");
  body = body.slice(start, end + 1);
  try {
    return JSON.parse(body);
  } catch {
    // Assistants sometimes leave trailing commas or smart quotes.
    const cleaned = body.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned);
  }
}

// `db`: the extended exercise library, when loaded — names that aren't
// built in are looked up there before becoming custom exercises.
export function parsePlanAnswer(text: string, db?: DbEntry[]): ParsedPlan {
  const raw = extractJson(text) as Record<string, unknown>;
  const warnings: string[] = [];
  const days = Array.isArray(raw.days) ? raw.days : [];
  if (!days.length) throw new Error("The answer has no training days in it.");

  const program: Program = {
    id: crypto.randomUUID(),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 60) : "AI plan",
    description: typeof raw.description === "string" ? raw.description.trim().slice(0, 200) : "Imported from AI",
    daysPerWeek: Math.min(7, days.length),
    custom: true,
    days: [],
  };

  days.forEach((d: Record<string, unknown>, di: number) => {
    const name = typeof d?.name === "string" && d.name.trim() ? d.name.trim().slice(0, 30) : `Day ${di + 1}`;
    const list = Array.isArray(d?.exercises) ? d.exercises : [];
    const exercises: PlanExercise[] = [];
    for (const e of list as Record<string, unknown>[]) {
      if (typeof e?.name !== "string" || !e.name.trim()) continue;
      const reps = parseReps(e.reps) ?? [8, 12];
      if (!parseReps(e.reps)) warnings.push(`${name}: no rep range for “${e.name}”, used 8–12.`);
      const sets = Math.max(1, Math.min(10, Math.round(Number(e.sets) || 3)));
      const known = matchExercise(e.name);
      let custom: ExerciseDef | undefined;
      const fromDb = !known && db ? bestDbMatch(db, e.name) : null;
      if (fromDb) custom = toDef(fromDb);
      else if (!known) {
        const guessed = guessMuscle(e.muscle, e.name);
        const muscle = guessed ?? "chest";
        if (!guessed) warnings.push(`${name}: couldn't tell which muscle “${e.name}” trains — set to chest, edit it if wrong.`);
        custom = {
          id: customExerciseId(e.name),
          name: e.name.trim().slice(0, 60),
          primary: muscle,
          kind: e.type === "isolation" ? "isolation" : "compound",
        };
      }
      exercises.push({
        exerciseId: known?.id ?? custom!.id,
        custom,
        sets,
        repMin: reps[0],
        repMax: reps[1],
        tip: typeof e.tip === "string" && e.tip.trim() ? e.tip.trim().slice(0, 140) : undefined,
      });
    }
    if (!exercises.length) {
      warnings.push(`${name} had no exercises and was skipped.`);
      return;
    }
    program.days.push({
      key: `d${di + 1}_${crypto.randomUUID().slice(0, 6)}`,
      name,
      focus: typeof d.focus === "string" ? d.focus.trim().slice(0, 80) : "",
      exercises,
    });
  });

  if (!program.days.length) throw new Error("None of the days had usable exercises.");
  program.daysPerWeek = program.days.length;
  const extra = program.days.flatMap((d) => d.exercises.filter((e) => e.custom));
  const fromLibrary = extra.filter((e) => e.custom!.id.startsWith("db:")).length;
  const own = extra.length - fromLibrary;
  if (fromLibrary) warnings.push(`${fromLibrary} matched from the extended exercise library (with demos and steps).`);
  if (own) warnings.push(`${own} exercise${own > 1 ? "s" : ""} weren't found anywhere and were added as your own — How-to can fill them in.`);
  return { program, warnings };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
