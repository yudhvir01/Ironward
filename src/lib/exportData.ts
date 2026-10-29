import type { Backup } from "./backend/types";
import { isCounted } from "./stats";
import type { Program } from "./program";
import type { BodyWeight, DailyLog, Workout } from "./types";

export function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v: string | number | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// One row per set — opens straight into Excel / Google Sheets.
export function exportCsv(workouts: Workout[]) {
  const rows = [["date", "workout", "exercise", "set", "weight_kg", "reps", "rir"]];
  for (const w of [...workouts].reverse()) {
    for (const ex of w.exercises) {
      ex.sets.filter(isCounted).forEach((s, i) => {
        rows.push([w.started_at.slice(0, 10), w.title, ex.name, String(i + 1), String(s.weight ?? ""), String(s.reps), s.rir === null ? "" : String(s.rir)]);
      });
    }
  }
  download(`ironward-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv", rows.map((r) => r.map(csvCell).join(",")).join("\n"));
}

export function exportBackup(workouts: Workout[], bodyweights: BodyWeight[], plans: Program[], logs: DailyLog[]) {
  const backup: Backup = { app: "ironward", version: 1, exportedAt: new Date().toISOString(), workouts, bodyweights, plans, logs };
  download(`ironward-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json", JSON.stringify(backup, null, 2));
}

export function parseBackup(text: string): Backup {
  const data = JSON.parse(text) as Partial<Backup>;
  if (data.app !== "ironward" || !Array.isArray(data.workouts)) throw new Error("That file isn't a Ironward backup.");
  return { app: "ironward", version: 1, exportedAt: data.exportedAt ?? "", workouts: data.workouts, bodyweights: data.bodyweights ?? [], plans: data.plans ?? [], logs: data.logs ?? [] };
}
