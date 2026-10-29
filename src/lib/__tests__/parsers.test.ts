import { describe, expect, it } from "vitest";
import { parsePlanAnswer } from "../ai";
import { readExport } from "../importCsv";
import { platesFor, warmupSets } from "../plates";

describe("AI plan answers", () => {
  it("digs the plan out of a chatty reply with trailing commas and smart quotes", () => {
    const reply = `Sure! Here you go:\n\`\`\`json\n{ "name": "Test", "days": [ { "name": “Upper”, "exercises": [
      { "name": "Bench Press (Barbell)", "muscle": "chest", "type": "compound", "sets": 3, "reps": "5–8" },
      { "name": "DB lateral raises", "muscle": "shoulders", "type": "isolation", "sets": "3", "reps": "12-20" },
      { "name": "Leg curl", "muscle": "legs", "sets": 2, "reps": 12 },
    ] } ] }\n\`\`\`\nGood luck!`;
    const { program, warnings } = parsePlanAnswer(reply);
    const [day] = program.days;
    expect(day.name).toBe("Upper");
    expect(day.exercises[0].exerciseId).toBe("bench_press");
    expect([day.exercises[0].repMin, day.exercises[0].repMax]).toEqual([5, 8]);
    expect(day.exercises[1].exerciseId).toBe("db_lateral_raise");
    // "Leg curl" isn't a library name; the muscle is guessed from the name, not from "legs".
    expect(day.exercises[2].custom?.primary).toBe("hamstrings");
    expect(warnings.some((w) => /couldn't tell/.test(w))).toBe(false);
  });

  it("rejects text with no plan in it", () => {
    expect(() => parsePlanAnswer("no json here")).toThrow();
  });
});

describe("Strong / Hevy import", () => {
  it("reads a Strong export (semicolons, warm-up rows skipped, lb converted)", () => {
    const csv = [
      "Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE",
      '2026-10-20 18:00:00;"Push Day";1h 5m;Bench Press (Barbell);W;45;10;0;0;;;',
      "2026-10-20 18:00:00;Push Day;1h 5m;Bench Press (Barbell);1;135;8;0;0;;;8",
      "2026-10-20 18:00:00;Push Day;1h 5m;Bench Press (Barbell);2;135;7;0;0;;;",
      "2026-10-20 18:00:00;Push Day;1h 5m;Cable Fly Crossover;1;30;12;0;0;;;",
    ].join("\n");
    const p = readExport(csv, "lb");
    expect(p.source).toBe("strong");
    expect(p.workouts).toHaveLength(1);
    const bench = p.workouts[0].exercises[0];
    expect(bench.exerciseId).toBe("bench_press");
    expect(bench.sets).toHaveLength(2);
    expect(bench.sets[0].weight!).toBeCloseTo(61.23, 1);
    expect(bench.sets[0].rir).toBe(2);
    expect(p.skippedRows).toBe(1);
    expect(p.workouts[0].finished_at! > p.workouts[0].started_at).toBe(true);
  });

  it("reads a Hevy export and gives re-imports the same ids", () => {
    const csv = [
      "title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe",
      '"Legs","20 Oct 2026, 18:00","20 Oct 2026, 19:10","","Squat (Barbell)",,"",0,warmup,40,10,,,',
      '"Legs","20 Oct 2026, 18:00","20 Oct 2026, 19:10","","Squat (Barbell)",,"belt on",1,normal,100,5,,,',
      '"Legs","20 Oct 2026, 18:00","20 Oct 2026, 19:10","","Pull Up",,"",0,failure,,9,,,',
    ].join("\n");
    const a = readExport(csv);
    const b = readExport(csv);
    expect(a.source).toBe("hevy");
    expect(a.workouts[0].id).toBe(b.workouts[0].id);
    expect(a.workouts[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    const [squat, pull] = a.workouts[0].exercises;
    expect(squat.exerciseId).toBe("back_squat");
    expect(squat.note).toBe("belt on");
    expect(pull.exerciseId).toBe("pull_ups");
    expect(pull.sets[0]).toMatchObject({ weight: null, reps: 9, tag: "failure" });
  });
});

describe("plates and warm-ups", () => {
  it("loads plates per side", () => {
    expect(platesFor(57.5, 20).perSide).toEqual([15, 2.5, 1.25]);
    expect(platesFor(225, 45, "lb").perSide).toEqual([45, 45]);
    expect(platesFor(21, 20).left).toBe(1);
  });

  it("ramps up from the bar to below the working weight", () => {
    expect(warmupSets(60, true, 20)).toEqual([
      { weight: 20, reps: 10 },
      { weight: 30, reps: 8 },
      { weight: 42.5, reps: 5 },
      { weight: 50, reps: 3 },
    ]);
    expect(warmupSets(20, true, 20)).toEqual([]);
  });
});
