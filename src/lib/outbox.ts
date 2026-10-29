import type { Backend } from "./backend/types";
import type { Workout } from "./types";

// Finished workouts that couldn't reach the server (no signal in the gym).
// Kept on the device, shown in History as if saved, and sent as soon as
// there's a connection again. Only used with an account; guest data never
// leaves the device anyway.

const KEY = "ironward.outbox";
const EVENT = "ironward-outbox";

export function pendingWorkouts(): Workout[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Workout[];
  } catch {
    return [];
  }
}

function write(list: Workout[]) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage full: the error surfaces on the workout screen instead.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function enqueue(w: Workout) {
  write([...pendingWorkouts().filter((p) => p.id !== w.id), w]);
}

export function onOutboxChange(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return e instanceof TypeError || /fetch|network|load failed|timed? ?out/i.test(msg);
}

// Sends what it can, oldest first; stops at the first failure so order is
// kept. Returns how many were sent.
export async function flushOutbox(backend: Backend): Promise<number> {
  let sent = 0;
  for (const w of pendingWorkouts()) {
    try {
      await backend.saveWorkout(w);
      write(pendingWorkouts().filter((p) => p.id !== w.id));
      sent++;
    } catch {
      break;
    }
  }
  return sent;
}

// The server's list plus anything still waiting, newest first.
export function withPending(list: Workout[]): Workout[] {
  const pending = pendingWorkouts();
  if (!pending.length) return list;
  const ids = new Set(pending.map((p) => p.id));
  return [...pending, ...list.filter((w) => !ids.has(w.id))].sort((a, b) => b.started_at.localeCompare(a.started_at));
}
