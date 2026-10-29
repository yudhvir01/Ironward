import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequiredBackend } from "../context/BackendProvider";
import { loadProgramId, saveProgramId } from "../lib/local";
import { findProgram, type Program } from "../lib/program";
import { enqueue, isNetworkError, withPending } from "../lib/outbox";
import type { LogKind, Workout } from "../lib/types";

export function useWorkouts() {
  const backend = useRequiredBackend();
  return useQuery({
    queryKey: ["workouts", backend.kind],
    queryFn: () => backend.listWorkouts(),
    // Workouts saved offline show up straight away.
    select: backend.kind === "supabase" ? withPending : undefined,
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
        if (backend.kind === "supabase" && isNetworkError(e)) enqueue(w);
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

export function useAddBodyWeight() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { day: string; kg: number }) => backend.addBodyWeight(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bodyweights"] }),
  });
}

export function useDeleteBodyWeight() {
  const backend = useRequiredBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.deleteBodyWeight(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bodyweights"] }),
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
