import { dayOf, localDay, weekStart } from "../lib/stats";
import type { Workout } from "../lib/types";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// Mon–Sun at a glance: filled = trained, ring = today. No streak counter —
// a missed day shouldn't feel like a broken chain.
export function WeekStrip({ workouts }: { workouts: Workout[] }) {
  const start = weekStart();
  const trained = new Set(workouts.map((w) => dayOf(w.started_at)));
  const today = localDay();
  return (
    <div className="flex justify-between">
      {LETTERS.map((letter, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = localDay(d);
        const done = trained.has(key);
        const isToday = key === today;
        const future = key > today;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className={`text-[10px] font-bold ${isToday ? "text-foreground" : "text-muted-foreground"}`}>{letter}</span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                done
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "ring-2 ring-primary text-foreground"
                    : future
                      ? "bg-muted/50 text-muted-foreground/60"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              {d.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
