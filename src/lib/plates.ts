import type { Unit } from "./units";

// Plates commonly found in gyms, per unit. Everything in this file works
// in the unit the person sees.
export const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export const BARS: Record<Unit, number[]> = { kg: [20, 15, 10, 0], lb: [45, 35, 25, 0] };

// Rounding for warm-up weights: the smallest pair of plates.
export const ROUND_STEP: Record<Unit, number> = { kg: 2.5, lb: 5 };

const STYLE: Record<string, { color: string; h: number }> = {
  "kg:25": { color: "#dc2626", h: 100 },
  "kg:20": { color: "#2563eb", h: 100 },
  "kg:15": { color: "#eab308", h: 90 },
  "kg:10": { color: "#16a34a", h: 80 },
  "kg:5": { color: "#e4e4e7", h: 62 },
  "kg:2.5": { color: "#52525b", h: 52 },
  "kg:1.25": { color: "#a1a1aa", h: 44 },
  "lb:45": { color: "#2563eb", h: 100 },
  "lb:35": { color: "#eab308", h: 92 },
  "lb:25": { color: "#16a34a", h: 84 },
  "lb:10": { color: "#e4e4e7", h: 66 },
  "lb:5": { color: "#52525b", h: 54 },
  "lb:2.5": { color: "#a1a1aa", h: 46 },
};

export function plateStyle(unit: Unit, p: number) {
  return STYLE[`${unit}:${p}`] ?? { color: "#a1a1aa", h: 50 };
}

// Greedy fill per side. `left` is what couldn't be made with these plates.
export function platesFor(total: number, bar: number, unit: Unit = "kg"): { perSide: number[]; left: number } {
  let side = Math.max(0, (total - bar) / 2);
  const perSide: number[] = [];
  for (const p of PLATES[unit]) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side -= p;
    }
  }
  return { perSide, left: Math.round(side * 2 * 100) / 100 };
}

export interface WarmupSet {
  weight: number;
  reps: number;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

// The plan's warm-up: a few lighter ramp-up sets before the first heavy
// set — e.g. empty bar → 30 → 45 before a 60 kg working weight.
export function warmupSets(target: number, barbell: boolean, bar: number, step = 2.5): WarmupSet[] {
  if (!target || target <= 0) return [];
  const steps = barbell
    ? [
        { pct: 0, reps: 10 },
        { pct: 0.5, reps: 8 },
        { pct: 0.7, reps: 5 },
        { pct: 0.85, reps: 3 },
      ]
    : [
        { pct: 0.5, reps: 10 },
        { pct: 0.75, reps: 5 },
      ];
  const out: WarmupSet[] = [];
  for (const s of steps) {
    const w = s.pct === 0 ? bar : roundTo(target * s.pct, barbell ? step : step / 2);
    if (barbell && w < bar) continue;
    if (w >= target || out.some((o) => o.weight >= w)) continue;
    out.push({ weight: w, reps: s.reps });
  }
  return out;
}
