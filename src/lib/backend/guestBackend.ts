import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Program } from "../program";
import type { BodyWeight, DailyLog, LogKind, Workout } from "../types";
import type { Backend, ImportData } from "./types";

interface GuestDB extends DBSchema {
  workouts: { key: string; value: Workout };
  bodyweights: { key: string; value: BodyWeight };
  plans: { key: string; value: Program };
  logs: { key: string; value: DailyLog };
}

let dbPromise: Promise<IDBPDatabase<GuestDB>> | null = null;

function getGuestDB(): Promise<IDBPDatabase<GuestDB>> {
  dbPromise ??= openDB<GuestDB>("ironward-guest", 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("workouts", { keyPath: "id" });
        db.createObjectStore("bodyweights", { keyPath: "id" });
      }
      // v1 -> v2 only adds custom plans.
      if (oldVersion < 2) db.createObjectStore("plans", { keyPath: "id" });
      // v2 -> v3 only adds protein / measurement logs.
      if (oldVersion < 3) db.createObjectStore("logs", { keyPath: "id" });
    },
  });
  return dbPromise;
}

// Guest data lives only in this browser's IndexedDB. Asking for persistent
// storage raises the odds it survives storage pressure (and Safari's 7-day
// rule); no browser lets a page force it, so Settings still warns about it.
export async function requestPersistentGuestStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export class GuestBackend implements Backend {
  readonly kind = "guest" as const;

  async listWorkouts(): Promise<Workout[]> {
    const rows = await (await getGuestDB()).getAll("workouts");
    return rows.sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  async saveWorkout(workout: Workout): Promise<void> {
    await (await getGuestDB()).put("workouts", workout);
  }

  async deleteWorkout(id: string): Promise<void> {
    await (await getGuestDB()).delete("workouts", id);
  }

  async listBodyWeights(): Promise<BodyWeight[]> {
    const rows = await (await getGuestDB()).getAll("bodyweights");
    return rows.sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at));
  }

  async addBodyWeight(input: { day: string; kg: number }): Promise<BodyWeight> {
    const row: BodyWeight = { id: crypto.randomUUID(), day: input.day, kg: input.kg, created_at: new Date().toISOString() };
    await (await getGuestDB()).put("bodyweights", row);
    return row;
  }

  async deleteBodyWeight(id: string): Promise<void> {
    await (await getGuestDB()).delete("bodyweights", id);
  }

  async listLogs(): Promise<DailyLog[]> {
    const rows = await (await getGuestDB()).getAll("logs");
    return rows.sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at));
  }

  async addLog(input: { day: string; kind: LogKind; value: number }): Promise<DailyLog> {
    const row: DailyLog = { id: crypto.randomUUID(), ...input, created_at: new Date().toISOString() };
    await (await getGuestDB()).put("logs", row);
    return row;
  }

  async deleteLog(id: string): Promise<void> {
    await (await getGuestDB()).delete("logs", id);
  }

  async listPlans(): Promise<Program[]> {
    const rows = await (await getGuestDB()).getAll("plans");
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  async savePlan(plan: Program): Promise<void> {
    await (await getGuestDB()).put("plans", plan);
  }

  async deletePlan(id: string): Promise<void> {
    await (await getGuestDB()).delete("plans", id);
  }

  async importAll(data: ImportData): Promise<void> {
    const db = await getGuestDB();
    const tx = db.transaction(["workouts", "bodyweights", "plans", "logs"], "readwrite");
    await Promise.all([
      ...(data.workouts ?? []).map((r) => tx.objectStore("workouts").put(r)),
      ...(data.bodyweights ?? []).map((r) => tx.objectStore("bodyweights").put(r)),
      ...(data.plans ?? []).map((r) => tx.objectStore("plans").put(r)),
      ...(data.logs ?? []).map((r) => tx.objectStore("logs").put(r)),
      tx.done,
    ]);
  }

  // Everything stored on this device, for moving it into a Google account.
  async exportAll(): Promise<Required<ImportData>> {
    const [workouts, bodyweights, plans, logs] = await Promise.all([this.listWorkouts(), this.listBodyWeights(), this.listPlans(), this.listLogs()]);
    return { workouts, bodyweights, plans, logs };
  }

  async deleteAccount(): Promise<void> {
    const db = await getGuestDB();
    const tx = db.transaction(["workouts", "bodyweights", "plans", "logs"], "readwrite");
    await Promise.all([
      tx.objectStore("workouts").clear(),
      tx.objectStore("bodyweights").clear(),
      tx.objectStore("plans").clear(),
      tx.objectStore("logs").clear(),
      tx.done,
    ]);
  }
}
