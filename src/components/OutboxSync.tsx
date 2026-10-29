import { useEffect, useSyncExternalStore } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useQueryClient } from "@tanstack/react-query";
import { useBackend } from "../context/BackendProvider";
import { flushOutbox, onOutboxChange, pendingWorkouts } from "../lib/outbox";

// Sends queued workouts whenever a connection comes back: on start, when
// the browser goes online, and when the app returns to the foreground.
export function OutboxSync() {
  const { backend } = useBackend();
  const qc = useQueryClient();

  useEffect(() => {
    if (!backend || backend.kind !== "drive") return;
    let busy = false;
    async function run() {
      if (busy || !pendingWorkouts().length || navigator.onLine === false) return;
      busy = true;
      try {
        if (await flushOutbox(backend!)) await qc.invalidateQueries({ queryKey: ["workouts"] });
      } finally {
        busy = false;
      }
    }
    void run();
    window.addEventListener("online", run);
    const timer = window.setInterval(run, 60_000);
    let remove: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener("appStateChange", (s) => s.isActive && void run()).then((l) => (remove = () => void l.remove()));
    }
    return () => {
      window.removeEventListener("online", run);
      window.clearInterval(timer);
      remove?.();
    };
  }, [backend, qc]);

  return null;
}

export function usePendingCount(): number {
  return useSyncExternalStore(onOutboxChange, () => pendingWorkouts().length, () => 0);
}

export function PendingSyncNote() {
  const count = usePendingCount();
  if (!count) return null;
  return (
    <p className="rounded-2xl bg-warn/10 px-4 py-3 text-sm font-semibold text-warn">
      ⏳ {count} workout{count > 1 ? "s" : ""} saved on this phone — will sync when you're back online.
    </p>
  );
}
