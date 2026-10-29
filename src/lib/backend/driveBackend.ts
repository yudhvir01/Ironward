import type { Program } from "../program";
import type { BodyWeight, DailyLog, LogKind, Workout } from "../types";
import { createDataFile, ensureAppFolder, loadDataFile, saveDataFile, trashFile } from "./driveClient";
import type { GoogleDriveSession } from "./googleAuth";
import type { Backend } from "./types";

const DATA_VERSION = 1;

interface DriveData {
  version: number;
  workouts: Workout[];
  bodyweights: BodyWeight[];
  plans: Program[];
  logs: DailyLog[];
}

function emptyData(): DriveData {
  return { version: DATA_VERSION, workouts: [], bodyweights: [], plans: [], logs: [] };
}

function upsert<T extends { id: string }>(list: T[], row: T): void {
  const i = list.findIndex((r) => r.id === row.id);
  if (i === -1) list.push(row);
  else list[i] = row;
}

// The whole account is one JSON file in an "Ironward" folder in the
// person's own Drive. There is no server, so this holds the dataset in
// memory (loaded on first use) and rewrites the file after every change.
// A gym log is a few hundred workouts a year, well inside what that can
// carry.
export class DriveBackend implements Backend {
  readonly kind = "drive" as const;

  private readonly session: GoogleDriveSession;
  private folderId: string | null = null;
  private fileId: string | null = null;
  private headRevisionId: string | undefined;
  private data: DriveData = emptyData();
  private loadPromise: Promise<void> | null = null;
  // Saves run one at a time so two quick changes can't both read the same
  // revision and race; changes made while a save waits ride along with it.
  private writeChain: Promise<void> = Promise.resolve();
  private nextSave: Promise<void> | null = null;

  constructor(session: GoogleDriveSession) {
    this.session = session;
  }

  private async ensureLoaded(): Promise<void> {
    this.loadPromise ??= (async () => {
      this.folderId = await ensureAppFolder(this.session);
      const file = await loadDataFile(this.session, this.folderId);
      if (!file) return;
      this.fileId = file.fileId;
      this.headRevisionId = file.headRevisionId;
      try {
        const parsed = JSON.parse(file.content) as Partial<DriveData>;
        this.data = {
          version: DATA_VERSION,
          workouts: parsed.workouts ?? [],
          bodyweights: parsed.bodyweights ?? [],
          plans: parsed.plans ?? [],
          logs: parsed.logs ?? [],
        };
      } catch {
        throw new Error("Couldn't read your Ironward data file on Drive — it may have been edited outside the app.");
      }
    })();
    // A failed load must be retried next time, not cached forever.
    this.loadPromise.catch(() => (this.loadPromise = null));
    return this.loadPromise;
  }

  private persist(): Promise<void> {
    if (this.nextSave) return this.nextSave;
    const save = this.writeChain.then(async () => {
      this.nextSave = null;
      const content = JSON.stringify(this.data);
      if (!this.fileId) {
        const created = await createDataFile(this.session, this.folderId!, content);
        this.fileId = created.fileId;
        this.headRevisionId = created.headRevisionId;
      } else {
        const saved = await saveDataFile(this.session, this.fileId, content, this.headRevisionId);
        this.headRevisionId = saved.headRevisionId;
      }
    });
    this.nextSave = save;
    this.writeChain = save.catch(() => {});
    return save;
  }

  async listWorkouts(): Promise<Workout[]> {
    await this.ensureLoaded();
    return [...this.data.workouts].sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  async saveWorkout(workout: Workout): Promise<void> {
    await this.ensureLoaded();
    upsert(this.data.workouts, workout);
    await this.persist();
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.ensureLoaded();
    this.data.workouts = this.data.workouts.filter((w) => w.id !== id);
    await this.persist();
  }

  async listBodyWeights(): Promise<BodyWeight[]> {
    await this.ensureLoaded();
    return [...this.data.bodyweights].sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at));
  }

  async addBodyWeight(input: { day: string; kg: number }): Promise<BodyWeight> {
    await this.ensureLoaded();
    const row: BodyWeight = { id: crypto.randomUUID(), day: input.day, kg: input.kg, created_at: new Date().toISOString() };
    this.data.bodyweights.push(row);
    await this.persist();
    return row;
  }

  async deleteBodyWeight(id: string): Promise<void> {
    await this.ensureLoaded();
    this.data.bodyweights = this.data.bodyweights.filter((b) => b.id !== id);
    await this.persist();
  }

  async listLogs(): Promise<DailyLog[]> {
    await this.ensureLoaded();
    return [...this.data.logs].sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at));
  }

  async addLog(input: { day: string; kind: LogKind; value: number }): Promise<DailyLog> {
    await this.ensureLoaded();
    const row: DailyLog = { id: crypto.randomUUID(), ...input, created_at: new Date().toISOString() };
    this.data.logs.push(row);
    await this.persist();
    return row;
  }

  async deleteLog(id: string): Promise<void> {
    await this.ensureLoaded();
    this.data.logs = this.data.logs.filter((l) => l.id !== id);
    await this.persist();
  }

  async listPlans(): Promise<Program[]> {
    await this.ensureLoaded();
    return [...this.data.plans].sort((a, b) => a.name.localeCompare(b.name));
  }

  async savePlan(plan: Program): Promise<void> {
    await this.ensureLoaded();
    upsert(this.data.plans, plan);
    await this.persist();
  }

  async deletePlan(id: string): Promise<void> {
    await this.ensureLoaded();
    this.data.plans = this.data.plans.filter((p) => p.id !== id);
    await this.persist();
  }

  // Trashes the Drive folder (recoverable from Drive for 30 days) and
  // withdraws the app's access to the Google account.
  async deleteAccount(): Promise<void> {
    const folderId = this.folderId ?? (await ensureAppFolder(this.session));
    await trashFile(this.session, folderId);
    this.data = emptyData();
    await this.session.revoke();
  }
}
