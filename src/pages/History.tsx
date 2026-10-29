import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarView } from "../components/CalendarView";
import { PageHeader } from "../components/AppShell";
import { PendingSyncNote } from "../components/OutboxSync";
import { useWorkouts } from "../hooks/useData";
import { dayOf, durationMinutes, fmtDay, fmtVolume, workoutSetCount, workoutVolume } from "../lib/stats";
import type { Workout } from "../lib/types";

export function History() {
  const { data: workouts = [], isLoading } = useWorkouts();
  const [view, setView] = useState<"list" | "calendar">("list");

  // Grouped by month, newest first.
  const groups = new Map<string, Workout[]>();
  for (const w of workouts) {
    const key = new Date(w.started_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }

  return (
    <div>
      <PageHeader
        title="History"
        subtitle={`${workouts.length} workout${workouts.length === 1 ? "" : "s"} logged`}
        right={
          <div className="flex rounded-full bg-muted p-0.5 text-xs font-bold">
            {(["list", "calendar"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1.5 capitalize ${view === v ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
        }
      />
      {view === "calendar" && workouts.length > 0 && (
        <div className="mb-6">
          <CalendarView workouts={workouts} />
        </div>
      )}
      <PendingSyncNote />
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && workouts.length === 0 && (
        <div className="card p-6 text-center text-muted-foreground">
          Nothing yet. Your finished workouts show up here.
        </div>
      )}
      <div className="space-y-6">
        {[...groups].map(([month, list]) => (
          <section key={month}>
            <p className="label mb-2 px-1">
              {month} · {list.length}
            </p>
            <div className="space-y-2">
              {list.map((w) => (
                <Link key={w.id} to={`/history/${w.id}`} className="card animate-in flex items-center justify-between gap-3 p-4 transition active:scale-[0.99]">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-black">{w.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{w.exercises.map((e) => e.name).join(" · ")}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    <p className="font-semibold text-foreground">{fmtDay(dayOf(w.started_at))}</p>
                    <p>
                      {workoutSetCount(w)} sets · {fmtVolume(workoutVolume(w))}
                      {durationMinutes(w) ? ` · ${durationMinutes(w)}m` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
