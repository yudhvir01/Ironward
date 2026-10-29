import { describe, expect, it } from "vitest";
import { onePerDay, weightSummary } from "../bodyWeight";
import type { BodyWeight } from "../types";

const w = (day: string, kg: number, at = `${day}T07:00:00.000Z`): BodyWeight => ({ id: `${day}-${at}`, day, kg, created_at: at });

describe("body weight", () => {
  it("keeps the latest entry per day", () => {
    const list = onePerDay([w("2026-10-01", 80), w("2026-10-01", 79.6, "2026-10-01T09:00:00.000Z"), w("2026-10-02", 79.8)]);
    expect(list.map((x) => [x.day, x.kg])).toEqual([
      ["2026-10-02", 79.8],
      ["2026-10-01", 79.6],
    ]);
  });

  it("summarises a range: change, low and high, oldest first", () => {
    const all = [w("2026-07-01", 83), w("2026-10-01", 80), w("2026-10-15", 79.2), w("2026-10-29", 79.5)];
    const month = weightSummary(all, "1m", "2026-10-29");
    expect(month.points.map((p) => p.kg)).toEqual([80, 79.2, 79.5]);
    expect(month).toMatchObject({ change: -0.5, low: 79.2, high: 80 });
    expect(weightSummary(all, "all", "2026-10-29").change).toBe(-3.5);
  });

  it("has no change with a single weigh-in, and nothing when empty", () => {
    expect(weightSummary([w("2026-10-29", 80)], "1m", "2026-10-29")).toMatchObject({ change: null, low: 80, high: 80 });
    expect(weightSummary([], "all", "2026-10-29").points).toEqual([]);
  });
});
