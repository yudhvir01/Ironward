import type { Muscle } from "../lib/types";

// Front and back figures shaded by weekly hard sets per muscle — same
// scale as the grid: dim → warming up → lime in the 10–20 range → amber
// past 20. Drawn from simple shapes so it stays crisp at any size.

type Part = { m?: Muscle; d: string };

const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 ${-rx * 2},0`;
const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}z`;
const pair = (m: Muscle | undefined, f: (cx: number) => string, left: number): Part[] => [
  { m, d: f(left) },
  { m, d: f(120 - left) },
];

const HEAD: Part[] = [{ d: ell(60, 20, 11, 12) }, { d: rect(54, 31, 12, 8, 3) }];
const LIMBS_NEUTRAL: Part[] = [...pair(undefined, (cx) => ell(cx, 99, 5, 13), 25), ...pair(undefined, (cx) => ell(cx, 168, 6, 5), 50)];

const FRONT: Part[] = [
  ...HEAD,
  ...pair("shoulders", (cx) => ell(cx, 47, 10, 8), 37),
  { m: "chest", d: rect(43, 41, 16, 21, 6) },
  { m: "chest", d: rect(61, 41, 16, 21, 6) },
  ...pair("biceps", (cx) => ell(cx, 71, 6, 13), 29),
  { m: "abs", d: rect(47, 65, 26, 40, 7) },
  { d: rect(45, 106, 30, 13, 6) },
  ...pair("quads", (cx) => ell(cx, 142, 10, 24), 50),
  ...pair("calves", (cx) => ell(cx, 194, 7, 20), 50),
  ...LIMBS_NEUTRAL,
];

const BACK: Part[] = [
  ...HEAD,
  { m: "back", d: rect(42, 40, 36, 50, 12) },
  ...pair("rear_delts", (cx) => ell(cx, 47, 9, 8), 35),
  ...pair("triceps", (cx) => ell(cx, 72, 6, 13), 29),
  { d: rect(48, 90, 24, 14, 6) },
  ...pair("glutes", (cx) => ell(cx, 115, 11, 11), 51),
  ...pair("hamstrings", (cx) => ell(cx, 148, 9, 22), 50),
  ...pair("calves", (cx) => ell(cx, 194, 8, 19), 50),
  ...LIMBS_NEUTRAL,
];

function fill(n: number | undefined, muscle: boolean): { fill: string; opacity: number } {
  if (!muscle) return { fill: "var(--muted)", opacity: 0.55 };
  if (!n) return { fill: "var(--muted)", opacity: 1 };
  if (n < 5) return { fill: "var(--primary)", opacity: 0.25 };
  if (n < 10) return { fill: "var(--primary)", opacity: 0.55 };
  if (n <= 20) return { fill: "var(--primary)", opacity: 1 };
  return { fill: "var(--warn)", opacity: 1 };
}

function Figure({ parts, sets, label }: { parts: Part[]; sets: Partial<Record<Muscle, number>>; label: string }) {
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 120 220" className="h-48 w-auto" role="img" aria-label={`${label} muscles`}>
        {parts.map((p, i) => {
          const f = fill(p.m ? sets[p.m] : undefined, Boolean(p.m));
          return (
            <path key={i} d={p.d} fill={f.fill} fillOpacity={f.opacity} stroke="var(--background)" strokeWidth={1.5}>
              {p.m && <title>{`${p.m}: ${Math.round((sets[p.m] ?? 0) * 10) / 10} sets`}</title>}
            </path>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">{label}</figcaption>
    </figure>
  );
}

export function BodyMap({ sets }: { sets: Partial<Record<Muscle, number>> }) {
  return (
    <div className="flex justify-center gap-6">
      <Figure parts={FRONT} sets={sets} label="Front" />
      <Figure parts={BACK} sets={sets} label="Back" />
    </div>
  );
}
