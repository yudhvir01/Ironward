import type { SupabaseClient } from "@supabase/supabase-js";
import type { Program } from "../program";
import type { BodyWeight, DailyLog, LogKind, Workout } from "../types";
import type { Backend } from "./types";

const WORKOUT_COLUMNS = "id, program_id, day_key, title, started_at, finished_at, note, exercises";

export class SupabaseBackend implements Backend {
  readonly kind = "supabase" as const;
  private client: SupabaseClient;
  private userId: string;

  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
  }

  async listWorkouts(): Promise<Workout[]> {
    const { data, error } = await this.client
      .from("workouts")
      .select(WORKOUT_COLUMNS)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return data as Workout[];
  }

  async saveWorkout(workout: Workout): Promise<void> {
    const { error } = await this.client.from("workouts").upsert({ ...workout, user_id: this.userId });
    if (error) throw error;
  }

  async deleteWorkout(id: string): Promise<void> {
    const { error } = await this.client.from("workouts").delete().eq("id", id);
    if (error) throw error;
  }

  async listBodyWeights(): Promise<BodyWeight[]> {
    const { data, error } = await this.client
      .from("bodyweights")
      .select("id, day, kg, created_at")
      .order("day", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    // numeric comes back as a string from PostgREST.
    return (data ?? []).map((row) => ({ ...row, kg: Number(row.kg) })) as BodyWeight[];
  }

  async addBodyWeight(input: { day: string; kg: number }): Promise<BodyWeight> {
    const { data, error } = await this.client
      .from("bodyweights")
      .insert({ user_id: this.userId, day: input.day, kg: input.kg })
      .select("id, day, kg, created_at")
      .single();
    if (error) throw error;
    return { ...data, kg: Number(data.kg) } as BodyWeight;
  }

  async deleteBodyWeight(id: string): Promise<void> {
    const { error } = await this.client.from("bodyweights").delete().eq("id", id);
    if (error) throw error;
  }

  async listLogs(): Promise<DailyLog[]> {
    const { data, error } = await this.client
      .from("daily_logs")
      .select("id, day, kind, value, created_at")
      .order("day", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({ ...row, value: Number(row.value) })) as DailyLog[];
  }

  async addLog(input: { day: string; kind: LogKind; value: number }): Promise<DailyLog> {
    const { data, error } = await this.client
      .from("daily_logs")
      .insert({ user_id: this.userId, ...input })
      .select("id, day, kind, value, created_at")
      .single();
    if (error) throw error;
    return { ...data, value: Number(data.value) } as DailyLog;
  }

  async deleteLog(id: string): Promise<void> {
    const { error } = await this.client.from("daily_logs").delete().eq("id", id);
    if (error) throw error;
  }

  async listPlans(): Promise<Program[]> {
    const { data, error } = await this.client.from("plans").select("id, data").order("name");
    if (error) throw error;
    return (data ?? []).map((row) => ({ ...(row.data as Program), id: row.id as string, custom: true }));
  }

  async savePlan(plan: Program): Promise<void> {
    const { error } = await this.client
      .from("plans")
      .upsert({ id: plan.id, user_id: this.userId, name: plan.name, data: plan, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async deletePlan(id: string): Promise<void> {
    const { error } = await this.client.from("plans").delete().eq("id", id);
    if (error) throw error;
  }

  async deleteAccount(): Promise<void> {
    // Rows cascade from auth.users; see delete_my_account in setup.sql.
    const { error } = await this.client.rpc("delete_my_account");
    if (error) throw error;
  }
}
