import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePlanAnswer } from "../ai";
import { bestDbMatch, searchDb, toDef, type DbEntry } from "../exerciseDb";
import { readExport } from "../importCsv";

const db = JSON.parse(readFileSync("public/exercise-db.json", "utf8")) as DbEntry[];

describe("extended exercise library", () => {
  it("matches confidently, and refuses vague names", () => {
    expect(bestDbMatch(db, "Zottman Curl")?.n).toBe("Zottman Curl");
    expect(bestDbMatch(db, "Arnold Press")?.n).toBe("Arnold Dumbbell Press");
    expect(bestDbMatch(db, "Shrug (Dumbbell)")?.n).toBe("Dumbbell Shrug");
    expect(bestDbMatch(db, "Curl")).toBeNull();
    expect(bestDbMatch(db, "Row")).toBeNull();
    expect(bestDbMatch(db, "Bulgarian goat squat")).toBeNull();
  });

  it("turns entries into exercises with the right muscle and flags", () => {
    const face = toDef(bestDbMatch(db, "Face Pull")!);
    expect(face.id).toBe("db:Face_Pull");
    expect(face.primary).toBe("rear_delts");
    const shrug = toDef(bestDbMatch(db, "Barbell Shrug")!);
    expect(shrug.primary).toBe("back");
    expect(shrug.barbell).toBe(true);
  });

  it("finds things by partial name", () => {
    expect(searchDb(db, "zottman").map((e) => e.n)).toContain("Zottman Curl");
    expect(searchDb(db, "x")).toEqual([]);
  });

  it("is used by AI plans and CSV imports before inventing custom exercises", () => {
    const plan = parsePlanAnswer(
      '{"name":"T","days":[{"name":"A","exercises":[{"name":"Zottman Curl","muscle":"forearms","sets":2,"reps":"10-12"},{"name":"Bulgarian goat squat","muscle":"quads","sets":2,"reps":"8"}]}]}',
      db,
    );
    const [zott, goat] = plan.program.days[0].exercises;
    expect(zott.custom?.id).toBe("db:Zottman_Curl");
    expect(goat.custom?.id).toBe("custom:bulgarian_goat_squat");
    const csv = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe\n"A","1 Oct 2026, 10:00","1 Oct 2026, 11:00","","Zercher Squat",,"",0,normal,60,8,,,';
    expect(readExport(csv, "kg", db).workouts[0].exercises[0].exerciseId).toBe("db:Zercher_Squats");
  });
});
