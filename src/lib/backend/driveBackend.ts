import type { Program } from "../program";
import type { BodyWeight, DailyLog, LogKind, Workout } from "../types";
import { cachePhoto, getCachedPhoto, uncachePhoto } from "../photos";
import { createDataFile, downloadBinaryFile, DriveConflictError, ensureAppFolder, getHeadRevision, loadDataFile, saveDataFile, trashFile, uploadBinaryFile } from "./driveClient";
import type { GoogleDriveSession } from "./googleAuth";
import type { Backend, ImportData, PhotoMeta } from "./types";

const DATA_VERSION = 1;
// How long a read trusts what's in memory before asking Drive (one small
// metadata request) whether another device has saved since.
const FRESH_FOR_MS = 30_000;

// A photo's image is its own file in the Ironward folder; the data file
// only records which file holds which day's photo.
interface DrivePhoto extends PhotoMeta {
  fileId: string;
}

interface DriveData {
  version: number;
  workouts: Workout[];
  bodyweights: BodyWeight[];
  plans: Program[];
  logs: DailyLog[];
  photos: DrivePhoto[];
}

function emptyData(): DriveData {
  return { version: DATA_VERSION, workouts: [], bodyweights: [], plans: [], logs: [], photos: [] };
}

function parseData(content: string): DriveData {
  try {
    const parsed = JSON.parse(content) as Partial<DriveData>;
    return {
      version: DATA_VERSION,
      workouts: parsed.workouts ?? [],
      bodyweights: parsed.bodyweights ?? [],
      plans: parsed.plans ?? [],
      logs: parsed.logs ?? [],
      photos: parsed.photos ?? [],
    };
  } catch {
    throw new Error("Couldn't read your Ironward data file on Drive — it may have been edited outside the app.");
  }
}

// Rows with an id already in `list` replace it; new ones are added.
function mergeById<T extends { id: string }>(list: T[], rows: T[] | undefined): T[] {
  if (!rows?.length) return list;
  const byId = new Map(list.map((r) => [r.id, r]));
  for (const r of rows) byId.set(r.id, r);
  return [...byId.values()];
}

type Change = (data: DriveData) => DriveData;

// The whole account is one JSON file in an "Ironward" folder in the
// person's own Drive. There is no server, so this keeps the dataset in
// memory and rewrites the file on every change. A gym log is a few
// hundred workouts a year, well inside what that can carry.
//
// Every change is a function applied to a copy of the data, which only
// becomes the in-memory copy once Drive has accepted it. If another device
// saved in between, the save is refused (revision check); the latest file
// is then loaded and the same change re-applied on top, so neither
// device's edits are lost and saving never gets stuck.
export class DriveBackend implements Backend {
  readonly kind = "drive" as const;

  private readonly session: GoogleDriveSession;
  private folderId: string | null = null;
  private fileId: string | null = null;
  private headRevisionId: string | undefined;
  private data: DriveData = emptyData();
  private loadedAt = 0;
  private loadPromise: Promise<void> | null = null;
  // Changes run one at a time so two quick ones can't race on a revision.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(session: GoogleDriveSession) {
    this.session = session;
  }

  private async load(): Promise<void> {
    this.folderId ??= await ensureAppFolder(this.session);
    const file = await loadDataFile(this.session, this.folderId);
    this.fileId = file?.fileId ?? null;
    this.headRevisionId = file?.headRevisionId;
    this.data = file ? parseData(file.content) : emptyData();
    this.loadedAt = Date.now();
  }

  private ensureLoaded(): Promise<void> {
    this.loadPromise ??= this.load().catch((e: unknown) => {
      // A failed load is retried next time rather than cached.
      this.loadPromise = null;
      throw e;
    });
    return this.loadPromise;
  }

  // For reads: picks up saves made on another device since the last look.
  private async fresh(): Promise<DriveData> {
    await this.ensureLoaded();
    if (Date.now() - this.loadedAt > FRESH_FOR_MS && this.fileId) {
      await this.run(async () => {
        const head = await getHeadRevision(this.session, this.fileId!);
        if (head !== this.headRevisionId) await this.load();
        else this.loadedAt = Date.now();
      });
    }
    return this.data;
  }

  private run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private change(apply: Change): Promise<void> {
    return this.run(async () => {
      await this.ensureLoaded();
      try {
        await this.save(apply(structuredClone(this.data)));
      } catch (e) {
        if (!(e instanceof DriveConflictError)) throw e;
        await this.load();
        await this.save(apply(structuredClone(this.data)));
      }
    });
  }

  private async save(next: DriveData): Promise<void> {
    const content = JSON.stringify(next);
    if (!this.fileId) {
      const created = await createDataFile(this.session, this.folderId!, content);
      this.fileId = created.fileId;
      this.headRevisionId = created.headRevisionId;
    } else {
      const saved = await saveDataFile(this.session, this.fileId, content, this.headRevisionId);
      this.headRevisionId = saved.headRevisionId;
    }
    this.data = next;
    this.loadedAt = Date.now();
  }

  async listWorkouts(): Promise<Workout[]> {
    const data = await this.fresh();
    return [...data.workouts].sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  saveWorkout(workout: Workout): Promise<void> {
    return this.change((d) => ({ ...d, workouts: mergeById(d.workouts, [workout]) }));
  }

  deleteWorkout(id: string): Promise<void> {
    return this.change((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) }));
  }

  async listBodyWeights(): Promise<BodyWeight[]> {
    const data = await this.fresh();
    return [...data.bodyweights].sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at));
  }

  async addBodyWeight(input: { day: string; kg: number }): Promise<BodyWeight> {
    const row: BodyWeight = { id: crypto.randomUUID(), day: input.day, kg: input.kg, created_at: new Date().toISOString() };
    await this.change((d) => ({ ...d, bodyweights: [...d.bodyweights, row] }));
    return row;
  }

  setBodyWeight(row: BodyWeight): Promise<void> {
    return this.change((d) => ({ ...d, bodyweights: [...d.bodyweights.filter((b) => b.day !== row.day && b.id !== row.id), row] }));
  }

  async listPhotos(): Promise<PhotoMeta[]> {
    const data = await this.fresh();
    return data.photos.map(({ id, day }) => ({ id, day })).sort((a, b) => a.day.localeCompare(b.day));
  }

  // Uploads the image first, then records it, so the data file never
  // points at a photo that isn't there.
  async addPhoto(day: string, image: Blob): Promise<PhotoMeta> {
    await this.ensureLoaded();
    const id = crypto.randomUUID();
    const fileId = await uploadBinaryFile(this.session, this.folderId!, `photo-${day}-${id.slice(0, 8)}.jpg`, image.type || "image/jpeg", image);
    await this.change((d) => ({ ...d, photos: [...d.photos, { id, day, fileId }] }));
    await cachePhoto(id, image).catch(() => undefined);
    return { id, day };
  }

  // Moves the image to the Drive trash (recoverable there for 30 days)
  // and forgets it.
  async deletePhoto(id: string): Promise<void> {
    await this.ensureLoaded();
    const photo = this.data.photos.find((p) => p.id === id);
    if (photo) await trashFile(this.session, photo.fileId);
    await this.change((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== id) }));
    await uncachePhoto(id).catch(() => undefined);
  }

  async photoBlob(id: string): Promise<Blob> {
    const cached = await getCachedPhoto(id).catch(() => undefined);
    if (cached) return cached;
    const data = await this.fresh();
    const photo = data.photos.find((p) => p.id === id);
    if (!photo) throw new Error("That photo is no longer in your Drive.");
    const blob = await downloadBinaryFile(this.session, photo.fileId);
    await cachePhoto(id, blob).catch(() => undefined);
    return blob;
  }

  deleteBodyWeight(id: string): Promise<void> {
    return this.change((d) => ({ ...d, bodyweights: d.bodyweights.filter((b) => b.id !== id) }));
  }

  async listLogs(): Promise<DailyLog[]> {
    const data = await this.fresh();
    return [...data.logs].sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at));
  }

  async addLog(input: { day: string; kind: LogKind; value: number }): Promise<DailyLog> {
    const row: DailyLog = { id: crypto.randomUUID(), ...input, created_at: new Date().toISOString() };
    await this.change((d) => ({ ...d, logs: [...d.logs, row] }));
    return row;
  }

  deleteLog(id: string): Promise<void> {
    return this.change((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id) }));
  }

  async listPlans(): Promise<Program[]> {
    const data = await this.fresh();
    return [...data.plans].sort((a, b) => a.name.localeCompare(b.name));
  }

  savePlan(plan: Program): Promise<void> {
    return this.change((d) => ({ ...d, plans: mergeById(d.plans, [plan]) }));
  }

  deletePlan(id: string): Promise<void> {
    return this.change((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== id) }));
  }

  // One upload for the whole import, however many rows.
  importAll(data: ImportData): Promise<void> {
    return this.change((d) => ({
      ...d,
      workouts: mergeById(d.workouts, data.workouts),
      bodyweights: mergeById(d.bodyweights, data.bodyweights),
      plans: mergeById(d.plans, data.plans),
      logs: mergeById(d.logs, data.logs),
    }));
  }

  // Trashes the Drive folder (recoverable from Drive for 30 days) and
  // withdraws the app's access to the Google account.
  async deleteAccount(): Promise<void> {
    await this.run(async () => {
      const folderId = this.folderId ?? (await ensureAppFolder(this.session));
      await trashFile(this.session, folderId);
      this.data = emptyData();
      this.fileId = null;
      this.loadPromise = null;
    });
    await this.session.revoke();
  }
}
