import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/AppShell";
import { AiReviewCard } from "../components/AiReviewCard";
import { RecapCard } from "../components/RecapCard";
import { MeasurementsCard } from "../components/MeasurementsCard";
import { PhotosCard } from "../components/PhotosCard";
import { BodyMap } from "../components/BodyMap";
import { fromUnit, getUnit, toUnit } from "../lib/units";
import { BarRow, LineChart } from "../components/Charts";
import { useAddBodyWeight, useBodyWeights, useDeleteBodyWeight, useWorkouts } from "../hooks/useData";
import { MUSCLE_LABEL, MUSCLES } from "../lib/program";
import {
  exerciseHistory,
  fmtDay,
  fmtKg,
  fmtVolume,
  localDay,
  loggedExercises,
  muscleSets,
  round1,
  stalledLifts,
  weekStart,
  weeklyBuckets,
} from "../lib/stats";

// Weekly hard sets per muscle that research commonly cites as the
// productive range for growth; under it is "could do more", well over it
// is "check recovery".
const SET_RANGE = { low: 10, high: 20 };

export function Progress() {
  const { data: workouts = [], isLoading } = useWorkouts();

  if (isLoading) return <p className="pt-6 text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Progress" subtitle="Are you getting stronger? This page answers that." />
      {workouts.length === 0 ? (
        <div className="card p-6 text-center text-muted-foreground">
          Finish a workout or two and your reports start filling in.
        </div>
      ) : (
        <>
          <Consistency />
          <MuscleVolume />
          <ExerciseProgress />
          <Stalled />
          <AiReviewCard />
          <RecapCard />
        </>
      )}
      <BodyWeightCard />
      <MeasurementsCard />
      <PhotosCard />
    </div>
  );
}

function Consistency() {
  const { data: workouts = [] } = useWorkouts();
  const weeks = weeklyBuckets(workouts, 10);
  const [metric, setMetric] = useState<"workouts" | "sets" | "volume">("workouts");
  const label = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  const current = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <p className="label">Last 10 weeks</p>
        <Segmented value={metric} onChange={setMetric} options={[["workouts", "Workouts"], ["sets", "Sets"], ["volume", "Volume"]]} />
      </div>
      <div className="mt-4">
        <BarRow
          bars={weeks.map((w, i) => ({
            label: i === weeks.length - 1 ? "Now" : label(w.start),
            value: metric === "volume" ? round1(w.volume / 1000) : w[metric],
            highlight: i === weeks.length - 1,
          }))}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {metric === "volume" && "Volume in tonnes (weight × reps). "}
        This week: <b className="text-foreground">{current.workouts} workouts</b>, {current.sets} sets, {fmtVolume(current.volume)}
        {prev && ` · last week ${prev.workouts} workouts, ${prev.sets} sets`}.
      </p>
    </section>
  );
}

function MuscleVolume() {
  const { data: workouts = [] } = useWorkouts();
  const [which, setWhich] = useState<"this" | "last">("this");
  const from = weekStart();
  if (which === "last") from.setDate(from.getDate() - 7);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  const sets = muscleSets(workouts, from, to);
  const scaleMax = 24;

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <p className="label">Sets per muscle</p>
        <Segmented value={which} onChange={setWhich} options={[["this", "This week"], ["last", "Last week"]]} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Shaded band = {SET_RANGE.low}–{SET_RANGE.high} hard sets a week, the usual range for growth. Helper muscles count half.
      </p>
      <div className="mt-4">
        <BodyMap sets={sets} />
      </div>
      <div className="mt-4 space-y-2">
        {MUSCLES.map((m) => {
          const n = round1(sets[m] ?? 0);
          const tone = n >= SET_RANGE.low && n <= SET_RANGE.high ? "bg-primary" : n > SET_RANGE.high ? "bg-warn" : "bg-muted-foreground/50";
          return (
            <div key={m} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-sm">
              <span className="truncate">{MUSCLE_LABEL[m]}</span>
              <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 bg-primary/15"
                  style={{ left: `${(SET_RANGE.low / scaleMax) * 100}%`, width: `${((SET_RANGE.high - SET_RANGE.low) / scaleMax) * 100}%` }}
                />
                <div className={`relative h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, (n / scaleMax) * 100)}%` }} />
              </div>
              <span className="text-right font-semibold tabular-nums">{n}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExerciseProgress() {
  const { data: workouts = [] } = useWorkouts();
  const options = useMemo(() => loggedExercises(workouts), [workouts]);
  const [selected, setSelected] = useState<string | null>(null);
  const id = selected ?? options[0]?.id;
  const history = useMemo(() => (id ? exerciseHistory(workouts, id) : []), [workouts, id]);
  if (!id) return null;

  // Plain bodyweight work (pull-ups, dips…) is tracked in reps; anything
  // with weight by estimated 1RM.
  const repsOnly = history.length > 0 && history[history.length - 1].repsOnly;
  const best = history.reduce((a, b) => (b.score > a.score ? b : a), history[0]);
  const heaviest = Math.max(...history.map((p) => p.heaviest));
  const first = history[0];
  const last = history[history.length - 1];
  const change = first && last && history.length > 1 && first.score ? ((last.score - first.score) / first.score) * 100 : null;

  return (
    <section className="card p-4">
      <p className="label">Exercise progress</p>
      <select className="field mt-2 !py-2.5 font-semibold" value={id} onChange={(e) => setSelected(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.count})
          </option>
        ))}
      </select>
      {history.length > 0 && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {repsOnly ? (
              <>
                <Kpi label="Best set" value={`${best.reps} reps`} />
                <Kpi label="Sessions" value={String(history.length)} />
              </>
            ) : (
              <>
                <Kpi label="Est. 1RM" value={fmtKg(round1(best.e1rm))} />
                <Kpi label="Heaviest" value={fmtKg(heaviest)} />
              </>
            )}
            <Kpi label="Change" value={change === null ? "–" : `${change >= 0 ? "+" : ""}${Math.round(change)}%`} good={change !== null && change > 0} />
          </div>
          {history.length < 2 ? (
            <p className="mt-3 rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">Log it once more to start a trend line.</p>
          ) : (
          <div className="mt-3">
            <LineChart
              points={history.map((p) => ({ label: fmtDay(p.day, { day: "numeric", month: "short" }), value: repsOnly ? p.score : toUnit(round1(p.e1rm)) }))}
              format={(v) => `${round1(v)}`}
            />
          </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {repsOnly ? "Most reps in a single set, each session." : "Estimated 1-rep max from your best set each session (Epley formula)."}
          </p>
          <ul className="mt-3 divide-y divide-border text-sm">
            {[...history].reverse().slice(0, 5).map((p) => (
              <li key={p.workoutId} className="flex justify-between py-2">
                <Link to={`/history/${p.workoutId}`} className="text-muted-foreground">
                  {fmtDay(p.day)}
                </Link>
                <span className="font-semibold tabular-nums">{p.topSet}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Stalled() {
  const { data: workouts = [] } = useWorkouts();
  const stalled = stalledLifts(workouts);
  if (!stalled.length) return null;
  return (
    <section className="card border-warn/40 p-4">
      <p className="label !text-warn">Stalled lifts</p>
      <p className="mt-1 text-sm text-muted-foreground">No improvement in your last 3 sessions. Check sleep and food first; then try fewer sets, a lighter week, or a swap.</p>
      <ul className="mt-2 space-y-1 text-sm font-semibold">
        {stalled.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
    </section>
  );
}

function BodyWeightCard() {
  const { data: weights = [] } = useBodyWeights();
  const add = useAddBodyWeight();
  const remove = useDeleteBodyWeight();
  const [value, setValue] = useState("");
  const unit = getUnit();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = Number(value.replace(",", "."));
    if (!v || v <= 0) return;
    await add.mutateAsync({ day: localDay(), kg: round1(fromUnit(v)) });
    setValue("");
  }

  const chrono = [...weights].reverse();
  const latest = weights[0];
  const monthAgo = weights.find((w) => Date.parse(w.day) <= Date.now() - 28 * 86400000);
  const delta = latest && monthAgo ? latest.kg - monthAgo.kg : null;

  return (
    <section className="card p-4">
      <p className="label">Body weight</p>
      {latest && (
        <p className="font-display mt-1 text-3xl font-black tabular-nums">
          {fmtKg(latest.kg)}
          {delta !== null && (
            <span className="ml-2 font-sans text-sm font-semibold text-muted-foreground">
              {delta >= 0 ? "+" : "−"}
              {fmtKg(Math.abs(delta))} in 4 weeks
            </span>
          )}
        </p>
      )}
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input className="field" type="number" inputMode="decimal" step="0.1" placeholder={`Today's weight (${unit})`} value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn-primary shrink-0" disabled={add.isPending || !value}>
          Log
        </button>
      </form>
      {chrono.length > 1 && (
        <div className="mt-3">
          <LineChart points={chrono.map((w) => ({ label: fmtDay(w.day, { day: "numeric", month: "short" }), value: toUnit(w.kg) }))} format={(v) => `${round1(v)}`} height={110} />
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Weigh in the morning a few times a week. For muscle gain, a slow climb (~0.25–0.5% a week) is the goal.</p>
      {weights.length > 0 && (
        <ul className="mt-2 divide-y divide-border text-sm">
          {weights.slice(0, 4).map((w) => (
            <li key={w.id} className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{fmtDay(w.day)}</span>
              <span className="flex items-center gap-3">
                <b className="tabular-nums">{fmtKg(w.kg)}</b>
                <button className="text-xs text-muted-foreground" onClick={() => remove.mutate(w.id)} aria-label="Delete entry">
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Kpi({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-muted p-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</p>
      <p className={`font-display text-lg font-black tabular-nums ${good ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-lg bg-muted p-0.5 text-[11px] font-semibold">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={`rounded-md px-2 py-1 ${value === v ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
