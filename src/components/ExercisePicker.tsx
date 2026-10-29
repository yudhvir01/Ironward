import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { guessMuscle } from "../lib/ai";
import { loadExerciseDb, searchDb, toDef } from "../lib/exerciseDb";
import { customExerciseId, EXERCISE_LIST, EXERCISES, MUSCLE_LABEL, MUSCLES } from "../lib/program";
import type { ExerciseDef, Muscle } from "../lib/types";

// Bottom sheet for adding or swapping an exercise: the plan's suggested
// swaps first, then search across the library, then "add your own".
export function ExercisePicker({
  title,
  suggested = [],
  rememberLabel,
  onPick,
  onClose,
}: {
  title: string;
  suggested?: string[];
  // When set, shows a "remember this swap" switch (on by default) and
  // passes its value to onPick.
  rememberLabel?: string;
  onPick: (def: ExerciseDef, remember: boolean) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [remember, setRemember] = useState(true);
  const [customMuscle, setCustomMuscle] = useState<Muscle>("chest");
  const [muscleTouched, setMuscleTouched] = useState(false);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return EXERCISE_LIST;
    return EXERCISE_LIST.filter((e) => e.name.toLowerCase().includes(q) || MUSCLE_LABEL[e.primary].toLowerCase().includes(q));
  }, [q]);

  const swaps = suggested.map((id) => EXERCISES[id]).filter(Boolean);

  // For "add your own", start from a guess based on the name ("squat" →
  // quads) until the person picks one themselves.
  useEffect(() => {
    if (!muscleTouched && q) setCustomMuscle(guessMuscle(null, q) ?? "chest");
  }, [q, muscleTouched]);

  // The extended library (~870), searched once there's a query. Built-in
  // exercises come first; library hits with the same name are skipped.
  const [more, setMore] = useState<ExerciseDef[]>([]);
  const [libraryState, setLibraryState] = useState<"idle" | "loading" | "offline">("idle");
  useEffect(() => {
    if (q.length < 2) {
      setMore([]);
      return;
    }
    let alive = true;
    setLibraryState("loading");
    const t = window.setTimeout(() => {
      loadExerciseDb()
        .then((db) => {
          if (!alive) return;
          const builtIn = new Set(EXERCISE_LIST.map((e) => e.name.toLowerCase()));
          setMore(searchDb(db, q, 25).map(toDef).filter((d) => !builtIn.has(d.name.toLowerCase())));
          setLibraryState("idle");
        })
        .catch(() => alive && setLibraryState("offline"));
    }, 150);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [q]);

  // Portalled for the same reason as Sheet.
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="pb-safe flex max-h-[85vh] w-full max-w-xl flex-col rounded-t-3xl bg-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="text-sm font-semibold text-muted-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="px-5 pt-3">
          <input className="field" placeholder="Search, or type a new exercise" value={query} onChange={(e) => setQuery(e.target.value)} />
          {rememberLabel && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {rememberLabel}
            </label>
          )}
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-2 pb-4">
          {!q && swaps.length > 0 && (
            <>
              <p className="label px-3 pt-2 pb-1">Suggested swaps</p>
              {swaps.map((e) => (
                <Row key={e.id} def={e} onPick={(d) => onPick(d, remember)} />
              ))}
              <p className="label px-3 pt-4 pb-1">All exercises</p>
            </>
          )}
          {results.map((e) => (
            <Row key={e.id} def={e} onPick={(d) => onPick(d, remember)} />
          ))}
          {q && more.length > 0 && (
            <>
              <p className="label px-3 pt-4 pb-1">More from the exercise library</p>
              {more.map((e) => (
                <Row key={e.id} def={e} onPick={(d) => onPick(d, remember)} />
              ))}
            </>
          )}
          {q && libraryState === "loading" && !more.length && <p className="px-3 pt-3 text-xs text-muted-foreground">Searching 870 more exercises…</p>}
          {q && libraryState === "offline" && <p className="px-3 pt-3 text-xs text-muted-foreground">The full exercise library needs a connection the first time.</p>}
          {q && (
            <div className="mx-3 mt-3 rounded-2xl border border-dashed border-border p-4">
              <p className="text-sm">
                Not listed? Add <b>“{query.trim()}”</b> as your own exercise
              </p>
              <div className="mt-3 flex gap-2">
                <select className="field !py-2" value={customMuscle} onChange={(e) => {
                    setMuscleTouched(true);
                    setCustomMuscle(e.target.value as Muscle);
                  }}>
                  {MUSCLES.map((m) => (
                    <option key={m} value={m}>
                      {MUSCLE_LABEL[m]}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary shrink-0 !py-2"
                  onClick={() =>
                    onPick(
                      {
                      id: customExerciseId(query),
                      name: query.trim(),
                      primary: customMuscle,
                      kind: ["chest", "back", "quads", "hamstrings", "glutes"].includes(customMuscle) ? "compound" : "isolation",
                      },
                      remember,
                    )
                  }
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ def, onPick }: { def: ExerciseDef; onPick: (d: ExerciseDef) => void }) {
  return (
    <button className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-muted" onClick={() => onPick(def)}>
      <span className="font-medium">{def.name}</span>
      <span className="text-xs text-muted-foreground">{MUSCLE_LABEL[def.primary]}</span>
    </button>
  );
}
