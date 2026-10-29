import { useBodyWeights, useAddLog, useDeleteLog, useLogs } from "../hooks/useData";
import { localDay, round1 } from "../lib/stats";

// The plan's nutrition rule as a one-tap counter: 1.6–2.2 g of protein per
// kg of body weight a day. Foods are common Indian gym staples.
const FOODS: { label: string; g: number }[] = [
  { label: "🥚 Egg", g: 6 },
  { label: "🥛 Milk glass", g: 8 },
  { label: "🥣 Curd bowl", g: 8 },
  { label: "🧀 Paneer 100g", g: 18 },
  { label: "🍗 Chicken 100g", g: 27 },
  { label: "🐟 Fish 100g", g: 22 },
  { label: "🫘 Soy chunks 50g", g: 26 },
  { label: "🍲 Dal bowl", g: 9 },
  { label: "🥤 Whey scoop", g: 24 },
  { label: "+10 g", g: 10 },
];

export function ProteinCard() {
  const { data: logs = [] } = useLogs();
  const { data: weights = [] } = useBodyWeights();
  const add = useAddLog();
  const remove = useDeleteLog();
  const today = localDay();
  const entries = logs.filter((l) => l.kind === "protein" && l.day === today);
  const total = entries.reduce((n, l) => n + l.value, 0);
  const bw = weights[0]?.kg;
  const lo = bw ? Math.round(bw * 1.6) : 120;
  const hi = bw ? Math.round(bw * 2.2) : null;
  const pct = Math.min(100, (total / lo) * 100);

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between">
        <p className="label">Protein today</p>
        <p className="text-xs font-semibold text-muted-foreground">
          Goal {hi ? `${lo}–${hi}` : lo} g{!bw && " · log body weight for yours"}
        </p>
      </div>
      <p className="font-display mt-1 text-3xl font-black tabular-nums">
        {round1(total)} <span className="text-base text-muted-foreground">g</span>
        {total >= lo && <span className="ml-2 text-base">✅</span>}
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {FOODS.map((f) => (
          <button
            key={f.label}
            disabled={add.isPending}
            onClick={() => add.mutate({ day: today, kind: "protein", value: f.g })}
            className="shrink-0 rounded-full bg-muted px-3 py-2 text-xs font-bold active:scale-95"
          >
            {f.label} <span className="text-muted-foreground">{f.g}g</span>
          </button>
        ))}
      </div>
      {entries.length > 0 && (
        <button className="mt-2 text-xs font-semibold text-muted-foreground" onClick={() => remove.mutate(entries[0].id)}>
          Undo last (+{entries[0].value} g)
        </button>
      )}
    </section>
  );
}
