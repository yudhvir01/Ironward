import { describe, expect, it } from "vitest";
import { PROGRAMS } from "../program";
import { exerciseHistory, nextPlanDay, prsIn, startWorkout, stalledLifts, suggest } from "../stats";
import type { LoggedExercise, Workout } from "../types";

const ex = (over: Partial<LoggedExercise> = {}): LoggedExercise => ({
  exerciseId: "bench_press",
  name: "Barbell bench press",
  primary: "chest",
  secondary: [],
  kind: "compound",
  repMin: 6,
  repMax: 8,
  sets: [1, 2, 3].map(() => ({ weight: null, reps: null, rir: null, done: false })),
  ...over,
});

const logged = (weight: number | null, reps: number[], over: Partial<LoggedExercise> = {}) =>
  ex({ ...over, sets: reps.map((r) => ({ weight, reps: r, rir: 2, done: true })) });

let day = 0;
const workout = (exercises: LoggedExercise[], over: Partial<Workout> = {}): Workout => {
  day++;
  const at = new Date(Date.UTC(2026, 9, day, 10)).toISOString();
  return { id: `w${day}`, program_id: "ppl6", day_key: "push_a", title: "Push A", started_at: at, finished_at: at, note: null, exercises, ...over };
};

describe("suggest (double progression)", () => {
  it("adds the configured jump once every set hits the top of the range", () => {
    const s = suggest(ex(), logged(60, [8, 8, 8]), { stepKg: 2.5 });
    expect(s.tone).toBe("up");
    expect(s.sets.every((x) => x.weight === 62.5 && x.reps === 6)).toBe(true);
  });

  it("respects a bigger smallest jump", () => {
    expect(suggest(ex(), logged(20, [8, 8, 8]), { stepKg: 5 }).sets[0].weight).toBe(25);
  });

  it("keeps the weight and asks for one more rep otherwise", () => {
    const s = suggest(ex(), logged(60, [8, 7, 6]));
    expect(s.tone).toBe("same");
    expect(s.sets.map((x) => x.reps)).toEqual([8, 8, 7]);
    expect(s.sets.every((x) => x.weight === 60)).toBe(true);
  });

  it("tracks plain bodyweight work in reps — never '0 kg'", () => {
    const pull = { exerciseId: "pull_ups", name: "Pull-ups", bodyweight: true, repMin: 6, repMax: 10 };
    const s = suggest(ex(pull), logged(null, [8, 7, 6], pull));
    expect(s.message).not.toMatch(/0 kg/);
    expect(s.message).toMatch(/8, 7, 6 reps/);
    expect(s.sets.map((x) => x.reps)).toEqual([9, 8, 7]);
    expect(s.sets.every((x) => x.weight === null)).toBe(true);
  });

  it("goes ~10% lighter in a deload week", () => {
    const s = suggest(ex(), logged(100, [8, 8, 8]), { stepKg: 2.5, deload: true });
    expect(s.tone).toBe("deload");
    expect(s.sets[0].weight).toBe(90);
  });
});

describe("plan sequence", () => {
  const ppl = PROGRAMS[0];
  it("starts at day one and resumes after the last session", () => {
    expect(nextPlanDay(ppl, []).key).toBe("push_a");
    expect(nextPlanDay(ppl, [workout([], { day_key: "legs_b" })]).key).toBe("push_a");
    expect(nextPlanDay(ppl, [workout([], { day_key: "pull_a" })]).key).toBe("legs_a");
  });

  it("applies remembered swaps, supersets and deload set counts", () => {
    const legs = ppl.days[2];
    const w = startWorkout(ppl, legs, {
      swaps: { back_squat: { id: "leg_press", name: "Leg press", primary: "quads", kind: "compound" } },
      supersets: ["seated_leg_curl"],
      deload: true,
    });
    expect(w.exercises[0].exerciseId).toBe("leg_press");
    expect(w.exercises[0].slot).toBe("back_squat");
    expect(w.exercises[0].sets).toHaveLength(2); // 3 → 2 in a deload
    const curl = w.exercises.findIndex((e) => e.exerciseId === "seated_leg_curl");
    expect(w.exercises[curl].superset).toBeTruthy();
    expect(w.exercises[curl + 1].superset).toBe(w.exercises[curl].superset);
  });
});

describe("records and reports", () => {
  it("finds weight PRs and rep PRs for bodyweight lifts", () => {
    const pull = { exerciseId: "pull_ups", name: "Pull-ups", bodyweight: true };
    const a = workout([logged(60, [8, 8, 8]), logged(null, [8, 7], pull)]);
    const b = workout([logged(62.5, [6, 6, 6]), logged(null, [10, 8], pull)]);
    const labels = prsIn(b, [b, a]).map((p) => p.label);
    expect(labels).toContain("Heaviest: 62.5 kg");
    expect(labels).toContain("Most reps: 10");
  });

  it("charts bodyweight work by reps", () => {
    const pull = { exerciseId: "pull_ups", name: "Pull-ups", bodyweight: true };
    const ws = [workout([logged(null, [10], pull)]), workout([logged(null, [8], pull)])].reverse();
    const h = exerciseHistory(ws, "pull_ups");
    expect(h.map((p) => p.score)).toEqual([10, 8]); // oldest first
    expect(h[0].repsOnly).toBe(true);
  });

  it("flags a lift that hasn't beaten its best in three sessions", () => {
    const now = Date.now();
    const at = (d: number) => new Date(now - d * 86400000).toISOString();
    const ws = [
      workout([logged(60, [8, 8, 8])], { started_at: at(1) }),
      workout([logged(60, [8, 8, 7])], { started_at: at(4) }),
      workout([logged(60, [8, 7, 7])], { started_at: at(8) }),
      workout([logged(62.5, [8, 8, 8])], { started_at: at(12) }),
    ];
    expect(stalledLifts(ws).map((s) => s.id)).toEqual(["bench_press"]);
  });
});
