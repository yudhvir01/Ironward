import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LineChart } from "./Charts";
import { useConfirm } from "./ConfirmDialog";
import { useAddBodyWeight, useBodyWeights, useDeleteBodyWeight } from "../hooks/useData";
import { onePerDay, WEIGHT_RANGES, weightSummary, type WeightRange } from "../lib/bodyWeight";
import { fmtDay, fmtKg, localDay, round1 } from "../lib/stats";
import { fromUnit, getUnit, toUnit } from "../lib/units";

// Logs a weigh-in for a day. A day has one weigh-in: logging it again
// replaces the old one instead of adding a second point to the chart.
function useLogWeight() {
  const { data: weights = [] } = useBodyWeights();
  const add = useAddBodyWeight();
  const remove = useDeleteBodyWeight();
  return {
    pending: add.isPending || remove.isPending,
    async log(day: string, input: string): Promise<boolean> {
      const v = Number(input.replace(",", "."));
      if (!v || v <= 0 || v > 1000) return false;
      for (const old of weights.filter((w) => w.day === day)) await remove.mutateAsync(old.id);
      await add.mutateAsync({ day, kg: round1(fromUnit(v)) });
      return true;
    },
  };
}

function signed(kg: number): string {
  return `${kg > 0 ? "+" : kg < 0 ? "−" : "±"}${fmtKg(Math.abs(kg))}`;
}

// Today screen: weigh in with one field and one tap.
export function WeighInCard() {
  const { data: weights = [] } = useBodyWeights();
  const { log, pending } = useLogWeight();
  const [value, setValue] = useState("");
  const today = localDay();
  const list = onePerDay(weights);
  const todays = list.find((w) => w.day === today);
  const previous = list.find((w) => w.day < today);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await log(today, value)) setValue("");
  }

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between">
        <p className="label">Body weight</p>
        <Link to="/progress#weight" className="text-xs font-semibold text-primary">
          Chart →
        </Link>
      </div>
      {todays ? (
        <p className="font-display mt-1 text-3xl font-black tabular-nums">
          {fmtKg(todays.kg)}
          <span className="ml-2 font-sans text-sm font-semibold text-muted-foreground">
            today{previous ? ` · ${signed(round1(todays.kg - previous.kg))} since ${fmtDay(previous.day, { day: "numeric", month: "short" })}` : ""}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{previous ? `Last: ${fmtKg(previous.kg)} on ${fmtDay(previous.day)}` : "Log your weight to see it charted over time."}</p>
      )}
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          className="field"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={todays ? `Update today (${getUnit()})` : `Today's weight (${getUnit()})`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn-primary shrink-0" disabled={pending || !value}>
          {todays ? "Update" : "Log"}
        </button>
      </form>
    </section>
  );
}

// Progress screen: log for any day, see the trend over a chosen range,
// and every past weigh-in.
export function BodyWeightCard() {
  const { data: weights = [] } = useBodyWeights();
  const { log, pending } = useLogWeight();
  const remove = useDeleteBodyWeight();
  const confirm = useConfirm();
  const [value, setValue] = useState("");
  const today = localDay();
  const [day, setDay] = useState(today);
  const [range, setRange] = useState<WeightRange>("3m");
  const [showAll, setShowAll] = useState(false);
  const unit = getUnit();

  const list = onePerDay(weights);
  const latest = list[0];
  const { points, change, low, high } = weightSummary(weights, range, today);
  const existing = list.find((w) => w.day === day);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await log(day, value)) {
      setValue("");
      setDay(today);
    }
  }

  async function del(id: string, when: string) {
    if (await confirm({ title: "Delete this weigh-in?", message: `The entry for ${fmtDay(when)} will be removed from the chart.`, confirmLabel: "Delete", tone: "danger" })) remove.mutate(id);
  }

  return (
    <section id="weight" className="card scroll-mt-4 p-4">
      <p className="label">Body weight</p>
      {latest && (
        <p className="font-display mt-1 text-3xl font-black tabular-nums">
          {fmtKg(latest.kg)}
          <span className="ml-2 font-sans text-sm font-semibold text-muted-foreground">{latest.day === today ? "today" : fmtDay(latest.day)}</span>
        </p>
      )}

      <form onSubmit={submit} className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            className="field"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={`Weight (${unit})`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`Weight in ${unit}`}
          />
          <input className="field !w-auto shrink-0" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} aria-label="Day" />
        </div>
        <button className="btn-primary w-full" disabled={pending || !value}>
          {existing ? `Replace ${fmtDay(day, { day: "numeric", month: "short" })} (${fmtKg(existing.kg)})` : day === today ? "Log today's weight" : `Log for ${fmtDay(day)}`}
        </button>
      </form>

      {list.length > 0 && (
        <>
          <div className="mt-4 flex rounded-xl bg-muted p-1 text-xs font-semibold" role="tablist" aria-label="Chart range">
            {WEIGHT_RANGES.map((r) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={range === r.key}
                onClick={() => setRange(r.key)}
                className={`flex-1 rounded-lg py-1.5 transition ${range === r.key ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {points.length > 1 ? (
            <div className="mt-3">
              <LineChart points={points.map((w) => ({ label: fmtDay(w.day, { day: "numeric", month: "short" }), value: toUnit(w.kg) }))} format={(v) => `${round1(v)}`} height={130} />
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
              {points.length === 1 ? "One weigh-in in this range. Log another to see the line." : "No weigh-ins in this range."}
            </p>
          )}
          {low !== null && high !== null && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Change" value={change === null ? "—" : signed(change)} />
              <Stat label="Lowest" value={fmtKg(low)} />
              <Stat label="Highest" value={fmtKg(high)} />
            </div>
          )}

          <ul className="mt-3 divide-y divide-border text-sm">
            {(showAll ? list : list.slice(0, 5)).map((w, i) => {
              const before = list[i + 1];
              return (
                <li key={w.id} className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{fmtDay(w.day)}</span>
                  <span className="flex items-center gap-3">
                    {before && <span className="text-xs text-muted-foreground tabular-nums">{signed(round1(w.kg - before.kg))}</span>}
                    <b className="tabular-nums">{fmtKg(w.kg)}</b>
                    <button className="px-1 text-xs text-muted-foreground" onClick={() => void del(w.id, w.day)} aria-label={`Delete weigh-in for ${fmtDay(w.day)}`}>
                      ✕
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          {list.length > 5 && (
            <button className="mt-1 w-full py-2 text-xs font-semibold text-primary" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show all ${list.length} weigh-ins`}
            </button>
          )}
        </>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Weigh in at the same time of day — first thing in the morning is easiest to compare.</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-base font-black tabular-nums">{value}</p>
    </div>
  );
}
