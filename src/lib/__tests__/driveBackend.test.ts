import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DriveBackend } from "../backend/driveBackend";
import type { GoogleDriveSession } from "../backend/googleAuth";
import type { Workout } from "../types";

// A minimal in-memory Google Drive: just the calls driveClient makes.
interface FakeFile {
  id: string;
  name: string;
  mimeType: string;
  parent: string | null;
  content: string;
  rev: number;
  trashed: boolean;
}

function fakeDrive() {
  const files = new Map<string, FakeFile>();
  let next = 1;
  const uploads = { count: 0 };
  // When set, the next request answers 401 once (a rejected access token).
  const state = { reject401: false };

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const meta = (f: FakeFile) => ({ id: f.id, headRevisionId: `r${f.rev}` });

  async function handler(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
    if (state.reject401) {
      state.reject401 = false;
      return json({ error: "unauthorized" }, 401);
    }
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const path = url.pathname;

    if (path === "/drive/v3/files" && method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      const name = /name = '([^']+)'/.exec(q)?.[1];
      const parent = /'([^']+)' in parents/.exec(q)?.[1] ?? null;
      const hits = [...files.values()].filter((f) => !f.trashed && f.name === name && (parent === null || f.parent === parent));
      return json({ files: hits.map(meta) });
    }
    if (path === "/drive/v3/files" && method === "POST") {
      const body = JSON.parse(String(init.body)) as { name: string; mimeType: string };
      const f: FakeFile = { id: `id${next++}`, name: body.name, mimeType: body.mimeType, parent: null, content: "", rev: 1, trashed: false };
      files.set(f.id, f);
      return json(meta(f));
    }
    if (path === "/upload/drive/v3/files" && method === "POST") {
      uploads.count++;
      const body = init.body instanceof Blob ? await init.body.text() : String(init.body);
      const parts = body.split(/--[0-9a-f-]+/);
      const metadata = JSON.parse(parts[1].split("\r\n\r\n")[1]) as { name: string; parents: string[] };
      const content = parts[2].split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\r\n$/, "");
      const f: FakeFile = { id: `id${next++}`, name: metadata.name, mimeType: "application/json", parent: metadata.parents[0], content, rev: 1, trashed: false };
      files.set(f.id, f);
      return json(meta(f));
    }
    const fileId = path.split("/").pop()!;
    const f = files.get(fileId);
    if (!f) return json({ error: "notFound" }, 404);
    if (path.startsWith("/upload/") && method === "PATCH") {
      uploads.count++;
      f.content = String(init.body);
      f.rev++;
      return json(meta(f));
    }
    if (method === "PATCH") {
      Object.assign(f, JSON.parse(String(init.body)));
      return json(meta(f));
    }
    if (url.searchParams.get("alt") === "media") return new Response(f.content);
    return json(meta(f));
  }

  return { files, uploads, state, handler };
}

const session = {
  email: "test@example.com",
  getAccessToken: async () => "token",
  forgetAccessToken: () => undefined,
  revoke: async () => undefined,
} as unknown as GoogleDriveSession;

const workout = (id: string, day: string): Workout =>
  ({ id, program_id: null, day_key: null, title: `Workout ${id}`, started_at: `${day}T10:00:00.000Z`, finished_at: `${day}T11:00:00.000Z`, note: null, exercises: [] }) as unknown as Workout;

let drive: ReturnType<typeof fakeDrive>;

beforeEach(() => {
  drive = fakeDrive();
  vi.stubGlobal("fetch", vi.fn(drive.handler));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("DriveBackend", () => {
  it("creates the folder and file on first save, and reads it back on a new device", async () => {
    await new DriveBackend(session).saveWorkout(workout("a", "2026-10-01"));
    const other = new DriveBackend(session);
    expect((await other.listWorkouts()).map((w) => w.id)).toEqual(["a"]);
  });

  it("keeps saving after another device writes (conflict reloads and re-applies)", async () => {
    const phone = new DriveBackend(session);
    const laptop = new DriveBackend(session);
    await phone.saveWorkout(workout("a", "2026-10-01"));
    await laptop.listWorkouts();
    await phone.saveWorkout(workout("b", "2026-10-02"));
    // The laptop's copy is now stale; its save must not fail or drop "b".
    await laptop.saveWorkout(workout("c", "2026-10-03"));
    await laptop.saveWorkout(workout("d", "2026-10-04"));
    expect((await new DriveBackend(session).listWorkouts()).map((w) => w.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("does not keep a change in memory when the upload fails", async () => {
    const b = new DriveBackend(session);
    await b.saveWorkout(workout("a", "2026-10-01"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    await expect(b.saveWorkout(workout("b", "2026-10-02"))).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn(drive.handler));
    expect((await b.listWorkouts()).map((w) => w.id)).toEqual(["a"]);
  });

  it("imports a whole dataset in one upload, without duplicating on a second run", async () => {
    const b = new DriveBackend(session);
    await b.listWorkouts();
    const data = {
      workouts: [workout("a", "2026-10-01"), workout("b", "2026-10-02")],
      bodyweights: [{ id: "w1", day: "2026-10-01", kg: 80, created_at: "2026-10-01T08:00:00.000Z" }],
    };
    await b.importAll(data);
    expect(drive.uploads.count).toBe(1);
    await b.importAll(data);
    expect((await b.listWorkouts()).length).toBe(2);
    expect((await b.listBodyWeights()).length).toBe(1);
  });

  it("sees another device's save on a later read", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const phone = new DriveBackend(session);
    const laptop = new DriveBackend(session);
    await phone.saveWorkout(workout("a", "2026-10-01"));
    expect((await laptop.listWorkouts()).length).toBe(1);
    await phone.saveWorkout(workout("b", "2026-10-02"));
    vi.setSystemTime(Date.now() + 60_000);
    expect((await laptop.listWorkouts()).length).toBe(2);
  });

  it("keeps one weigh-in per day, replacing in a single upload", async () => {
    const b = new DriveBackend(session);
    await b.addBodyWeight({ day: "2026-10-29", kg: 80.4 });
    const before = drive.uploads.count;
    await b.setBodyWeight({ id: "new", day: "2026-10-29", kg: 80, created_at: "2026-10-29T09:00:00.000Z" });
    expect(drive.uploads.count - before).toBe(1);
    expect((await new DriveBackend(session).listBodyWeights()).map((w) => w.kg)).toEqual([80]);
  });

  it("saves photos as Drive files and trashes them on delete", async () => {
    const b = new DriveBackend(session);
    const photo = await b.addPhoto("2026-10-29", new Blob(["jpeg-bytes"], { type: "image/jpeg" }));
    const file = [...drive.files.values()].find((f) => f.name.startsWith("photo-2026-10-29"));
    expect(file?.trashed).toBe(false);
    const other = new DriveBackend(session);
    expect(await other.listPhotos()).toEqual([{ id: photo.id, day: "2026-10-29" }]);
    expect(await (await other.photoBlob(photo.id)).text()).toBe("jpeg-bytes");
    await other.deletePhoto(photo.id);
    expect(file?.trashed).toBe(true);
    expect(await new DriveBackend(session).listPhotos()).toEqual([]);
  });

  it("retries once with a fresh token when Drive answers 401", async () => {
    const b = new DriveBackend(session);
    await b.saveWorkout(workout("a", "2026-10-01"));
    drive.state.reject401 = true;
    await b.saveWorkout(workout("b", "2026-10-02"));
    expect((await new DriveBackend(session).listWorkouts()).length).toBe(2);
  });
});
