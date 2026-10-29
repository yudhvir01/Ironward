import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequiredBackend } from "../context/BackendProvider";
import { loadProgramId, saveProgramId } from "../lib/local";
import { findProgram, type Program } from "../lib/program";
import { enqueue, isNetworkError, withPending } from "../lib/outbox";
import type { BodyWeight, LogKind, Workout } from "../lib/types";
import type { Backend, PhotoMeta } from "../lib/backend/types";

export function useWorkouts() {
  const backend = useRequiredBackend();
  return useQuery({
    queryKey: ["workouts", backend.kind],
    queryFn: () => backend.listWorkouts(),
    // Workouts saved offline show up straight away.
    select: backend.kind === "drive" ? withPending : undefined,
  });
}

export function useBodyWeights() {
  const backend = useRequiredBackend();
  return useQuery({ queryKey: ["bodyweights", backend.kind], queryFn: () => backend.listBodyWeights() });
}

export function useSaveWorkout() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    // Runs even offline, so a lost connection queues the workout instead
    // of leaving the person stuck on the Finish button.
    networkMode: "always",
    mutationFn: async (w: Workout) => {
      try {
        await backend.saveWorkout(w);
      } catch (e) {
        if (backend.kind === "drive" && isNetworkError(e)) enqueue(w);
        else throw e;
      }
    },
    onSuccess: (_, w) => {
      qc.setQueryData<Workout[]>(["workouts", backend.kind], (list) =>
        list ? [w, ...list.filter((x) => x.id !== w.id)].sort((a, b) => b.started_at.localeCompare(a.started_at)) : list,
      );
      void qc.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
}

export function useDeleteWorkout() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.deleteWorkout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

// Weigh-ins update the list the moment they're entered and save in the
// background; a failed save puts the list back the way it was.
function useBodyWeightMutation<T>(run: (backend: Backend, input: T) => Promise<unknown>, apply: (list: BodyWeight[], input: T) => BodyWeight[]) {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  const key = ["bodyweights", backend.kind];
  return useMutation({
    mutationFn: (input: T) => run(backend, input),
    onMutate: async (input: T) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<BodyWeight[]>(key);
      qc.setQueryData<BodyWeight[]>(key, (list = []) =>
        apply(list, input).sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at)),
      );
      return { before };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.before) qc.setQueryData(key, ctx.before);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["bodyweights"] }),
  });
}

export function useAddBodyWeight() {
  return useBodyWeightMutation<{ day: string; kg: number }>(
    (backend, input) => backend.addBodyWeight(input),
    (list, input) => [...list, { id: `pending-${input.day}`, ...input, created_at: new Date().toISOString() }],
  );
}

// The weigh-in for a day, replacing any already logged that day.
export function useSetBodyWeight() {
  return useBodyWeightMutation<{ day: string; kg: number }>(
    (backend, input) => backend.setBodyWeight({ id: crypto.randomUUID(), ...input, created_at: new Date().toISOString() }),
    (list, input) => [...list.filter((w) => w.day !== input.day), { id: `pending-${input.day}`, ...input, created_at: new Date().toISOString() }],
  );
}

export function useDeleteBodyWeight() {
  return useBodyWeightMutation<string>(
    (backend, id) => backend.deleteBodyWeight(id),
    (list, id) => list.filter((w) => w.id !== id),
  );
}

export function usePhotos() {
  const backend = useRequiredBackend();
  return useQuery({ queryKey: ["photos", backend.kind], queryFn: () => backend.listPhotos() });
}

export function useAddPhoto() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ day, image }: { day: string; image: Blob }) => backend.addPhoto(day, image),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  });
}

export function useDeletePhoto() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  const key = ["photos", backend.kind];
  return useMutation({
    mutationFn: (id: string) => backend.deletePhoto(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<PhotoMeta[]>(key);
      qc.setQueryData<PhotoMeta[]>(key, (list = []) => list.filter((p) => p.id !== id));
      return { before };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.before) qc.setQueryData(key, ctx.before);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  });
}

export function usePlans() {
  const backend = useRequiredBackend();
  return useQuery({ queryKey: ["plans", backend.kind], queryFn: () => backend.listPlans() });
}

export function useSavePlan() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: Program) => backend.savePlan({ ...plan, custom: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

export function useDeletePlan() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.deletePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

// The plan the Train tab follows. Chosen per device; on a fresh device it
// falls back to whatever plan the latest workout used, so signing in on a
// new phone just carries on.
export function useActiveProgram(): { program: Program; plans: Program[]; setActive: (id: string) => void } {
  const { data: plans = [] } = usePlans();
  const { data: workouts = [] } = useWorkouts();
  const [chosen, setChosen] = useState(() => loadProgramId());
  const id = chosen ?? workouts.find((w) => w.program_id)?.program_id ?? null;
  return {
    program: findProgram(id, plans),
    plans,
    setActive(next: string) {
      saveProgramId(next);
      setChosen(next);
    },
  };
}

export function useLogs() {
  const backend = useRequiredBackend();
  return useQuery({ queryKey: ["logs", backend.kind], queryFn: () => backend.listLogs() });
}

export function useAddLog() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { day: string; kind: LogKind; value: number }) => backend.addLog(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });
}

export function useDeleteLog() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.deleteLog(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });
}
