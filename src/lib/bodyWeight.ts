import type { BodyWeight } from "./types";

export type WeightRange = "1m" | "3m" | "1y" | "all";

export const WEIGHT_RANGES: { key: WeightRange; label: string; days: number | null }[] = [
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 91 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
];

// One weigh-in counts per day: the most recently entered one wins, so
// correcting a typo or re-weighing replaces rather than doubles up.
export function onePerDay(weights: BodyWeight[]): BodyWeight[] {
  const byDay = new Map<string, BodyWeight>();
  for (const w of weights) {
    const kept = byDay.get(w.day);
    if (!kept || w.created_at > kept.created_at) byDay.set(w.day, w);
  }
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
}

// Entries (oldest first) inside the range ending at `today`, plus how
// the range moved: change from its first to last weigh-in, low and high.
export function weightSummary(weights: BodyWeight[], range: WeightRange, today: string) {
  const days = WEIGHT_RANGES.find((r) => r.key === range)!.days;
  const from = days === null ? "" : shiftDay(today, -days);
  const points = onePerDay(weights)
    .filter((w) => w.day >= from && w.day <= today)
    .reverse();
  if (!points.length) return { points, change: null, low: null, high: null };
  const kgs = points.map((p) => p.kg);
  return {
    points,
    change: points.length > 1 ? Math.round((kgs[kgs.length - 1] - kgs[0]) * 10) / 10 : null,
    low: Math.min(...kgs),
    high: Math.max(...kgs),
  };
}

function shiftDay(day: string, by: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}
