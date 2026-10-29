import { useState } from "react";
import { Link } from "react-router-dom";
import { dayOf, localDay } from "../lib/stats";
import type { Workout } from "../lib/types";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

// A month at a glance: lime days were training days (tap to open), today
// is ringed. Monday-first, like the week strip.
export function CalendarView({ workouts }: { workouts: Workout[] }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const byDay = new Map<string, Workout[]>();
  for (const w of workouts) {
    const d = dayOf(w.started_at);
    byDay.set(d, [...(byDay.get(d) ?? []), w]);
  }
  const today = localDay();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthCount = cells.filter((d) => d && byDay.has(localDay(new Date(first.getFullYear(), first.getMonth(), d)))).length;

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <button className="rounded-full px-3 py-1 text-lg font-bold active:bg-muted" onClick={() => setOffset((o) => o + 1)} aria-label="Previous month">
          ‹
        </button>
        <div className="text-center">
          <p className="font-display text-lg font-black">{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
          <p className="text-xs text-muted-foreground">{monthCount} training days</p>
        </div>
        <button className="rounded-full px-3 py-1 text-lg font-bold active:bg-muted disabled:opacity-30" disabled={offset === 0} onClick={() => setOffset((o) => o - 1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
        {DOW.map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = localDay(new Date(first.getFullYear(), first.getMonth(), d));
          const list = byDay.get(key);
          const cls = `flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-bold tabular-nums ${
            list ? "bg-primary text-primary-foreground" : key === today ? "ring-2 ring-primary" : key > today ? "text-muted-foreground/40" : "bg-muted/60 text-muted-foreground"
          }`;
          return list ? (
            <Link key={i} to={`/history/${list[0].id}`} className={cls} title={list.map((w) => w.title).join(", ")}>
              {d}
              <span className="max-w-full truncate px-0.5 text-[8px] leading-none font-black opacity-80">{list[0].title.split(" ")[0]}</span>
            </Link>
          ) : (
            <span key={i} className={cls}>
              {d}
            </span>
          );
        })}
      </div>
    </section>
  );
}
