import { MUSCLE_LABEL, MUSCLES } from "../lib/program";
import type { Muscle } from "../lib/types";
import { BodyMap } from "./BodyMap";

// Weekly sets per muscle as a heat grid: dim = untouched, warming up
// toward the 10–20 growth range, amber once it's past 20.
function heat(n: number): string {
  if (n <= 0) return "bg-muted text-muted-foreground";
  if (n < 5) return "bg-primary/15 text-foreground";
  if (n < 10) return "bg-primary/35 text-foreground";
  if (n <= 20) return "bg-primary text-primary-foreground";
  return "bg-warn text-black";
}

export function MuscleMap({ sets }: { sets: Partial<Record<Muscle, number>> }) {
  return (
    <div>
      <BodyMap sets={sets} />
      <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {MUSCLES.map((m) => {
          const n = Math.round((sets[m] ?? 0) * 10) / 10;
          return (
            <div key={m} className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold ${heat(n)}`}>
              <span className="truncate">{MUSCLE_LABEL[m]}</span>
              <span className="ml-1 tabular-nums">{n}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground">
        <Legend className="bg-muted" label="0" />
        <Legend className="bg-primary/35" label="< 10" />
        <Legend className="bg-primary" label="10–20 sweet spot" />
        <Legend className="bg-warn" label="20+" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}
