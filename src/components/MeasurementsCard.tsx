import { useState, type FormEvent } from "react";
import { useAddLog, useDeleteLog, useLogs } from "../hooks/useData";
import { fmtDay, localDay, round1 } from "../lib/stats";
import { getUnit } from "../lib/units";
import type { LogKind } from "../lib/types";

const KINDS: { kind: LogKind; label: string }[] = [
  { kind: "waist", label: "Waist" },
  { kind: "chest", label: "Chest" },
  { kind: "arm", label: "Arm" },
  { kind: "thigh", label: "Thigh" },
  { kind: "hips", label: "Hips" },
];

const IN = 2.54;

// Tape measurements: the honest check on whether weight gained is muscle
// (arms/chest up, waist steady). Stored in cm, shown in inches for lb users.
export function MeasurementsCard() {
  const { data: logs = [] } = useLogs();
  const add = useAddLog();
  const remove = useDeleteLog();
  const [kind, setKind] = useState<LogKind>("waist");
  const [value, setValue] = useState("");
  const inches = getUnit() === "lb";
  const unit = inches ? "in" : "cm";
  const show = (cm: number) => round1(inches ? cm / IN : cm);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = Number(value.replace(",", "."));
    if (!v || v <= 0) return;
    await add.mutateAsync({ day: localDay(), kind, value: round1(inches ? v * IN : v) });
    setValue("");
  }

  const rows = KINDS.map(({ kind: k, label }) => {
    const list = logs.filter((l) => l.kind === k); // newest first
    return { k, label, latest: list[0], first: list[list.length - 1], count: list.length };
  });

  return (
    <section className="card p-4">
      <p className="label">Measurements</p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {rows.map((r) => {
          const change = r.latest && r.first && r.count > 1 ? show(r.latest.value) - show(r.first.value) : null;
          return (
            <button
              key={r.k}
              onClick={() => setKind(r.k)}
              className={`rounded-2xl p-2 text-center ${kind === r.k ? "bg-foreground text-background" : "bg-muted"}`}
            >
              <span className="block text-[10px] font-bold uppercase opacity-70">{r.label}</span>
              <span className="font-display block text-base font-black tabular-nums">{r.latest ? show(r.latest.value) : "–"}</span>
              {change !== null && (
                <span className="block text-[10px] font-semibold opacity-70">
                  {change >= 0 ? "+" : ""}
                  {round1(change)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          className="field"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={`${KINDS.find((k) => k.kind === kind)!.label} today (${unit})`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn-primary shrink-0" disabled={add.isPending || !value}>
          Log
        </button>
      </form>
      {logs.filter((l) => l.kind === kind).length > 0 && (
        <ul className="mt-2 divide-y divide-border text-sm">
          {logs
            .filter((l) => l.kind === kind)
            .slice(0, 3)
            .map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">{fmtDay(l.day)}</span>
                <span className="flex items-center gap-3">
                  <b className="tabular-nums">
                    {show(l.value)} {unit}
                  </b>
                  <button className="text-xs text-muted-foreground" onClick={() => remove.mutate(l.id)} aria-label="Delete entry">
                    ✕
                  </button>
                </span>
              </li>
            ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Measure every 2–4 weeks, same time of day, tape snug not tight.</p>
    </section>
  );
}
