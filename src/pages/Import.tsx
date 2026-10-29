import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BackIcon } from "../components/Icons";
import { useRequiredBackend } from "../context/BackendProvider";
import { loadExerciseDb, type DbEntry } from "../lib/exerciseDb";
import { readExport, type ImportPreview } from "../lib/importCsv";
import { dayOf, fmtDay, workoutSetCount } from "../lib/stats";
import { getUnit } from "../lib/units";

// Bring history over from Strong or Hevy so switching costs nothing.
export function Import() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [strongUnit, setStrongUnit] = useState<"kg" | "lb">(getUnit());
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [db, setDb] = useState<DbEntry[] | undefined>();
  useEffect(() => {
    loadExerciseDb().then(setDb).catch(() => undefined);
  }, []);

  let preview: ImportPreview | null = null;
  let parseError: string | null = null;
  if (text) {
    try {
      preview = readExport(text, strongUnit, db);
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Couldn't read that file.";
    }
  }

  async function run() {
    if (!preview) return;
    setError(null);
    try {
      for (let i = 0; i < preview.workouts.length; i++) {
        await backend.saveWorkout(preview.workouts[i]);
        setProgress(i + 1);
      }
      await qc.invalidateQueries({ queryKey: ["workouts"] });
      navigate("/history", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The import stopped part-way. Run it again — nothing is duplicated.");
      setProgress(null);
    }
  }

  const sets = preview?.workouts.reduce((n, w) => n + workoutSetCount(w), 0) ?? 0;
  const oldest = preview?.workouts[preview.workouts.length - 1];
  const newest = preview?.workouts[0];

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-center gap-2 pt-6">
        <Link to="/settings" className="-ml-2 rounded-full p-2 text-muted-foreground" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="font-display text-2xl font-black">Import history</h1>
      </header>

      <section className="card space-y-3 p-4 text-sm">
        <p className="font-bold">From Strong</p>
        <p className="text-muted-foreground">Profile → Settings → Export data → share the CSV to your phone's files.</p>
        <p className="font-bold">From Hevy</p>
        <p className="text-muted-foreground">Profile → Settings → Export &amp; import data → Export workouts.</p>
      </section>

      <label className="btn-primary w-full cursor-pointer py-4 text-base">
        {fileName ? `Chosen: ${fileName}` : "Choose CSV file"}
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            setText(await f.text());
          }}
        />
      </label>

      {preview?.source === "strong" && (
        <div className="card flex items-center justify-between p-4 text-sm">
          <span>Weights in this Strong file are in</span>
          <div className="flex rounded-full bg-muted p-0.5 font-bold">
            {(["kg", "lb"] as const).map((u) => (
              <button key={u} onClick={() => setStrongUnit(u)} className={`rounded-full px-3 py-1 ${strongUnit === u ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
      )}

      {(parseError || error) && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{parseError ?? error}</p>}

      {preview && (
        <section className="card glow animate-in p-5">
          <p className="label !text-primary">Found in your {preview.source === "hevy" ? "Hevy" : "Strong"} export</p>
          <p className="font-display mt-1 text-4xl font-black">{preview.workouts.length} workouts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {sets} sets · {oldest && newest ? `${fmtDay(dayOf(oldest.started_at), { month: "short", year: "numeric" })} – ${fmtDay(dayOf(newest.started_at), { month: "short", year: "numeric" })}` : ""}
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            <li>✓ {preview.matched} exercises matched to the exercise library (with demos and how-to)</li>
            {preview.custom.length > 0 && (
              <li>
                + {preview.custom.length} added as your own: <span className="text-muted-foreground">{preview.custom.slice(0, 6).join(", ")}{preview.custom.length > 6 ? "…" : ""}</span>
              </li>
            )}
            {preview.skippedRows > 0 && <li className="text-muted-foreground">Skipped {preview.skippedRows} warm-up or empty rows</li>}
          </ul>
          <button className="btn-primary mt-5 w-full py-4 text-base" onClick={run} disabled={progress !== null}>
            {progress !== null ? `Importing ${progress}/${preview.workouts.length}…` : `Import ${preview.workouts.length} workouts`}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Safe to run twice — the same workouts are replaced, not duplicated.</p>
        </section>
      )}
    </div>
  );
}
