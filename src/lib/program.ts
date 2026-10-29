import type { ExerciseDef, Muscle } from "./types";

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  rear_delts: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
};

export const MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[];

const list: ExerciseDef[] = [
  // Chest
  { id: "bench_press", name: "Barbell bench press", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound", barbell: true },
  { id: "incline_db_press", name: "Incline dumbbell press", primary: "chest", secondary: ["shoulders", "triceps"], kind: "compound" },
  { id: "incline_smith_press", name: "Incline Smith machine press", primary: "chest", secondary: ["shoulders", "triceps"], kind: "compound" },
  { id: "flat_db_press", name: "Flat dumbbell bench press", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound" },
  { id: "machine_chest_press", name: "Machine chest press", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound" },
  { id: "cable_fly", name: "Cable chest fly", primary: "chest", kind: "isolation" },
  { id: "pec_deck", name: "Pec deck", primary: "chest", kind: "isolation" },
  { id: "dips", name: "Dips", primary: "chest", secondary: ["triceps"], kind: "compound", bodyweight: true },
  { id: "push_ups", name: "Push-ups", primary: "chest", secondary: ["triceps"], kind: "compound", bodyweight: true },
  // Shoulders
  { id: "machine_shoulder_press", name: "Machine shoulder press", primary: "shoulders", secondary: ["triceps"], kind: "compound" },
  { id: "db_shoulder_press", name: "Seated dumbbell shoulder press", primary: "shoulders", secondary: ["triceps"], kind: "compound" },
  { id: "cable_lateral_raise", name: "Cable lateral raise", primary: "shoulders", kind: "isolation" },
  { id: "db_lateral_raise", name: "Dumbbell lateral raise", primary: "shoulders", kind: "isolation" },
  { id: "reverse_pec_deck", name: "Reverse pec deck", primary: "rear_delts", kind: "isolation" },
  { id: "cable_rear_delt_fly", name: "Cable rear-delt fly", primary: "rear_delts", kind: "isolation" },
  { id: "face_pull", name: "Face pull", primary: "rear_delts", kind: "isolation" },
  // Triceps
  { id: "rope_pushdown", name: "Rope triceps pushdown", primary: "triceps", kind: "isolation" },
  { id: "cable_pushdown", name: "Cable triceps pushdown", primary: "triceps", kind: "isolation" },
  { id: "overhead_cable_ext", name: "Overhead cable triceps extension", primary: "triceps", kind: "isolation" },
  { id: "overhead_db_ext", name: "Overhead dumbbell triceps extension", primary: "triceps", kind: "isolation" },
  { id: "skull_crusher", name: "EZ-bar skull crusher", primary: "triceps", kind: "isolation" },
  // Back
  { id: "pull_ups", name: "Pull-ups", primary: "back", secondary: ["biceps"], kind: "compound", bodyweight: true },
  { id: "lat_pulldown", name: "Lat pulldown", primary: "back", secondary: ["biceps"], kind: "compound" },
  { id: "close_grip_pulldown", name: "Close-grip lat pulldown", primary: "back", secondary: ["biceps"], kind: "compound" },
  { id: "chest_supported_row", name: "Chest-supported row", primary: "back", secondary: ["biceps", "rear_delts"], kind: "compound" },
  { id: "seated_cable_row", name: "Seated cable row", primary: "back", secondary: ["biceps", "rear_delts"], kind: "compound" },
  { id: "one_arm_db_row", name: "One-arm dumbbell row", primary: "back", secondary: ["biceps", "rear_delts"], kind: "compound", perSide: true },
  { id: "barbell_row", name: "Barbell row", primary: "back", secondary: ["biceps", "rear_delts"], kind: "compound", barbell: true },
  { id: "straight_arm_pulldown", name: "Straight-arm cable pulldown", primary: "back", kind: "isolation" },
  // Biceps
  { id: "incline_db_curl", name: "Incline dumbbell curl", primary: "biceps", kind: "isolation" },
  { id: "hammer_curl", name: "Hammer curl", primary: "biceps", kind: "isolation" },
  { id: "ez_preacher_curl", name: "EZ-bar preacher curl", primary: "biceps", kind: "isolation" },
  { id: "cable_rope_hammer_curl", name: "Cable rope hammer curl", primary: "biceps", kind: "isolation" },
  { id: "barbell_curl", name: "Barbell curl", primary: "biceps", kind: "isolation", barbell: true },
  // Legs
  { id: "back_squat", name: "Barbell back squat", primary: "quads", secondary: ["glutes"], kind: "compound", barbell: true },
  { id: "hack_squat", name: "Hack squat", primary: "quads", secondary: ["glutes"], kind: "compound" },
  { id: "leg_press", name: "Leg press", primary: "quads", secondary: ["glutes"], kind: "compound" },
  { id: "bulgarian_split_squat", name: "Bulgarian split squat", primary: "quads", secondary: ["glutes"], kind: "compound", perSide: true },
  { id: "leg_extension", name: "Leg extension", primary: "quads", kind: "isolation" },
  { id: "rdl", name: "Romanian deadlift", primary: "hamstrings", secondary: ["glutes", "back"], kind: "compound", barbell: true },
  { id: "db_rdl", name: "Dumbbell Romanian deadlift", primary: "hamstrings", secondary: ["glutes"], kind: "compound" },
  { id: "seated_leg_curl", name: "Seated leg curl", primary: "hamstrings", kind: "isolation" },
  { id: "lying_leg_curl", name: "Lying leg curl", primary: "hamstrings", kind: "isolation" },
  { id: "hip_thrust", name: "Hip thrust (machine or barbell)", primary: "glutes", secondary: ["hamstrings"], kind: "compound" },
  { id: "standing_calf_raise", name: "Standing calf raise", primary: "calves", kind: "isolation" },
  { id: "seated_calf_raise", name: "Seated calf raise", primary: "calves", kind: "isolation" },
  // Abs
  { id: "cable_crunch", name: "Cable crunch", primary: "abs", kind: "isolation" },
  { id: "hanging_knee_raise", name: "Hanging knee raise", primary: "abs", kind: "isolation", bodyweight: true },
  { id: "plank", name: "Plank (reps = seconds)", primary: "abs", kind: "isolation", bodyweight: true },
];

export const EXERCISES: Record<string, ExerciseDef> = Object.fromEntries(list.map((e) => [e.id, e]));
export const EXERCISE_LIST = list;

export interface PlanExercise {
  exerciseId: string;
  // Set when the exercise isn't in the built-in library (a custom plan,
  // or one imported from an AI answer), so the plan carries its own
  // definition.
  custom?: ExerciseDef;
  sets: number;
  repMin: number;
  repMax: number;
  // Shown as one-tap swaps, e.g. pull-ups ↔ lat pulldown.
  alternatives?: string[];
  tip?: string;
  // Done back to back with the next exercise.
  superset?: boolean;
}

export interface PlanDay {
  key: string;
  name: string;
  focus: string;
  exercises: PlanExercise[];
}

export interface Program {
  id: string;
  name: string;
  daysPerWeek: number;
  description: string;
  days: PlanDay[];
  // Made by the person (or imported from AI) rather than built in.
  custom?: boolean;
}

export function repRange(p: { repMin: number; repMax: number }): string {
  return p.repMin === p.repMax ? String(p.repMin) : `${p.repMin}–${p.repMax}`;
}

// The library entry for a plan's exercise, wherever it's defined.
export function defFor(p: PlanExercise): ExerciseDef {
  return (
    p.custom ??
    EXERCISES[p.exerciseId] ?? { id: p.exerciseId, name: p.exerciseId, primary: "chest", kind: "compound" }
  );
}

// Built-in plans first, then the person's own; unknown ids fall back to the
// default so a deleted plan never leaves the Train tab empty.
export function findProgram(id: string | null | undefined, custom: Program[] = []): Program {
  return custom.find((p) => p.id === id) ?? PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0];
}

const pplA_push: PlanDay = {
  key: "push_a",
  name: "Push A",
  focus: "Chest · Front & side delts · Triceps",
  exercises: [
    { exerciseId: "bench_press", sets: 3, repMin: 6, repMax: 8, alternatives: ["machine_chest_press", "flat_db_press"], tip: "Upper back tight, feet planted. Lower under control — no bounce." },
    { exerciseId: "incline_db_press", sets: 3, repMin: 8, repMax: 10, alternatives: ["incline_smith_press"], tip: "Modest incline, 15–30°." },
    { exerciseId: "machine_shoulder_press", sets: 2, repMin: 8, repMax: 12, alternatives: ["db_shoulder_press"], tip: "Stop if you feel sharp shoulder pain." },
    { exerciseId: "cable_lateral_raise", sets: 3, repMin: 12, repMax: 20, alternatives: ["db_lateral_raise"], tip: "Lead with the elbows, no torso swing." },
    { exerciseId: "rope_pushdown", sets: 3, repMin: 10, repMax: 15, alternatives: ["cable_pushdown"] },
    { exerciseId: "overhead_cable_ext", sets: 2, repMin: 10, repMax: 15, alternatives: ["overhead_db_ext"] },
  ],
};

const pplA_pull: PlanDay = {
  key: "pull_a",
  name: "Pull A",
  focus: "Lats · Upper back · Rear delts · Biceps",
  exercises: [
    { exerciseId: "lat_pulldown", sets: 3, repMin: 6, repMax: 10, alternatives: ["pull_ups"], tip: "Pull to the upper chest, torso reasonably upright." },
    { exerciseId: "chest_supported_row", sets: 3, repMin: 8, repMax: 12, alternatives: ["barbell_row"], tip: "Drive elbows back without jerking." },
    { exerciseId: "seated_cable_row", sets: 2, repMin: 10, repMax: 12, tip: "Let the shoulder blades move; don't rock the torso." },
    { exerciseId: "reverse_pec_deck", sets: 3, repMin: 12, repMax: 20, alternatives: ["cable_rear_delt_fly", "face_pull"], tip: "Light enough that traps don't take over." },
    { exerciseId: "incline_db_curl", sets: 3, repMin: 8, repMax: 12, alternatives: ["barbell_curl"] },
    { exerciseId: "hammer_curl", sets: 2, repMin: 10, repMax: 15 },
  ],
};

const pplA_legs: PlanDay = {
  key: "legs_a",
  name: "Legs A",
  focus: "Quads · Hamstrings · Glutes · Calves · Abs",
  exercises: [
    { exerciseId: "back_squat", sets: 3, repMin: 6, repMax: 10, alternatives: ["hack_squat"], tip: "Depth you can control — don't force painful depth." },
    { exerciseId: "leg_press", sets: 3, repMin: 10, repMax: 15, tip: "Hips and lower back stay on the pad." },
    { exerciseId: "rdl", sets: 3, repMin: 8, repMax: 10, alternatives: ["db_rdl"], tip: "Hips back, bar close. Hamstring stretch, not back pain." },
    { exerciseId: "seated_leg_curl", sets: 3, repMin: 10, repMax: 15, alternatives: ["lying_leg_curl"] },
    { exerciseId: "standing_calf_raise", sets: 3, repMin: 10, repMax: 15, tip: "Pause in the stretch, no bouncing." },
    { exerciseId: "cable_crunch", sets: 2, repMin: 12, repMax: 20 },
  ],
};

const pplB_push: PlanDay = {
  key: "push_b",
  name: "Push B",
  focus: "Upper chest · Shoulders · Triceps",
  exercises: [
    { exerciseId: "incline_smith_press", sets: 3, repMin: 6, repMax: 10, alternatives: ["incline_db_press"] },
    { exerciseId: "flat_db_press", sets: 3, repMin: 8, repMax: 12, alternatives: ["machine_chest_press"] },
    { exerciseId: "cable_fly", sets: 2, repMin: 12, repMax: 15, alternatives: ["pec_deck"], tip: "First set to drop if you're running out of gas." },
    { exerciseId: "db_lateral_raise", sets: 3, repMin: 12, repMax: 20, alternatives: ["cable_lateral_raise"] },
    { exerciseId: "machine_shoulder_press", sets: 2, repMin: 8, repMax: 12, alternatives: ["db_shoulder_press"] },
    { exerciseId: "cable_pushdown", sets: 3, repMin: 10, repMax: 15, alternatives: ["rope_pushdown"] },
    { exerciseId: "overhead_db_ext", sets: 2, repMin: 10, repMax: 15, alternatives: ["overhead_cable_ext"] },
  ],
};

const pplB_pull: PlanDay = {
  key: "pull_b",
  name: "Pull B",
  focus: "Back · Rear delts · Biceps",
  exercises: [
    { exerciseId: "close_grip_pulldown", sets: 3, repMin: 8, repMax: 12, alternatives: ["pull_ups"] },
    { exerciseId: "one_arm_db_row", sets: 3, repMin: 8, repMax: 12, tip: "Per side. Elbow toward the hip." },
    { exerciseId: "straight_arm_pulldown", sets: 2, repMin: 12, repMax: 15, tip: "Slight elbow bend; move with the lats." },
    { exerciseId: "reverse_pec_deck", sets: 2, repMin: 12, repMax: 20, alternatives: ["cable_rear_delt_fly"] },
    { exerciseId: "ez_preacher_curl", sets: 3, repMin: 8, repMax: 12 },
    { exerciseId: "cable_rope_hammer_curl", sets: 2, repMin: 10, repMax: 15, alternatives: ["hammer_curl"] },
  ],
};

const pplB_legs: PlanDay = {
  key: "legs_b",
  name: "Legs B",
  focus: "Hamstrings · Glutes · Quads · Calves · Abs",
  exercises: [
    { exerciseId: "rdl", sets: 3, repMin: 6, repMax: 10, alternatives: ["hip_thrust", "db_rdl"], tip: "Too beat up from Wednesday? Go lighter or swap to hip thrust." },
    { exerciseId: "bulgarian_split_squat", sets: 2, repMin: 8, repMax: 12, tip: "Per leg. Bodyweight first, dumbbells once balanced." },
    { exerciseId: "lying_leg_curl", sets: 3, repMin: 10, repMax: 15, alternatives: ["seated_leg_curl"] },
    { exerciseId: "leg_extension", sets: 3, repMin: 12, repMax: 15, tip: "Smooth, brief squeeze at the top — don't snap the knees." },
    { exerciseId: "seated_calf_raise", sets: 3, repMin: 12, repMax: 20 },
    { exerciseId: "hanging_knee_raise", sets: 2, repMin: 10, repMax: 15, tip: "Curl the pelvis up, don't just swing." },
  ],
};

export const PROGRAMS: Program[] = [
  {
    id: "ppl6",
    name: "Push · Pull · Legs (6 days)",
    daysPerWeek: 6,
    description: "Every muscle twice a week, two different sessions per movement. Mon–Sat, Sunday off.",
    days: [pplA_push, pplA_pull, pplA_legs, pplB_push, pplB_pull, pplB_legs],
  },
  {
    id: "ul4",
    name: "Upper · Lower (4 days)",
    daysPerWeek: 4,
    description: "Everything twice a week in four sessions. Good when six days won't fit your week.",
    days: [
      {
        key: "upper_a",
        name: "Upper A",
        focus: "Chest · Back · Shoulders · Arms",
        exercises: [
          { exerciseId: "bench_press", sets: 3, repMin: 6, repMax: 8, alternatives: ["machine_chest_press"] },
          { exerciseId: "lat_pulldown", sets: 3, repMin: 8, repMax: 10, alternatives: ["pull_ups"] },
          { exerciseId: "incline_db_press", sets: 2, repMin: 8, repMax: 12 },
          { exerciseId: "chest_supported_row", sets: 3, repMin: 8, repMax: 12 },
          { exerciseId: "cable_lateral_raise", sets: 3, repMin: 12, repMax: 20, alternatives: ["db_lateral_raise"] },
          { exerciseId: "incline_db_curl", sets: 2, repMin: 8, repMax: 12 },
          { exerciseId: "rope_pushdown", sets: 2, repMin: 10, repMax: 15 },
        ],
      },
      {
        key: "lower_a",
        name: "Lower A",
        focus: "Quads · Hamstrings · Calves",
        exercises: [
          { exerciseId: "back_squat", sets: 3, repMin: 6, repMax: 10, alternatives: ["hack_squat"] },
          { exerciseId: "rdl", sets: 3, repMin: 8, repMax: 10 },
          { exerciseId: "leg_press", sets: 2, repMin: 10, repMax: 15 },
          { exerciseId: "seated_leg_curl", sets: 3, repMin: 10, repMax: 15 },
          { exerciseId: "standing_calf_raise", sets: 3, repMin: 10, repMax: 15 },
          { exerciseId: "cable_crunch", sets: 2, repMin: 12, repMax: 20 },
        ],
      },
      {
        key: "upper_b",
        name: "Upper B",
        focus: "Back · Chest · Shoulders · Arms",
        exercises: [
          { exerciseId: "pull_ups", sets: 3, repMin: 6, repMax: 10, alternatives: ["close_grip_pulldown"] },
          { exerciseId: "incline_smith_press", sets: 3, repMin: 6, repMax: 10 },
          { exerciseId: "one_arm_db_row", sets: 3, repMin: 8, repMax: 12 },
          { exerciseId: "machine_shoulder_press", sets: 2, repMin: 8, repMax: 12 },
          { exerciseId: "reverse_pec_deck", sets: 3, repMin: 12, repMax: 20 },
          { exerciseId: "ez_preacher_curl", sets: 2, repMin: 8, repMax: 12 },
          { exerciseId: "overhead_cable_ext", sets: 2, repMin: 10, repMax: 15 },
        ],
      },
      {
        key: "lower_b",
        name: "Lower B",
        focus: "Hamstrings · Glutes · Quads · Calves",
        exercises: [
          { exerciseId: "rdl", sets: 3, repMin: 6, repMax: 10, alternatives: ["hip_thrust"] },
          { exerciseId: "bulgarian_split_squat", sets: 2, repMin: 8, repMax: 12 },
          { exerciseId: "lying_leg_curl", sets: 3, repMin: 10, repMax: 15 },
          { exerciseId: "leg_extension", sets: 3, repMin: 12, repMax: 15 },
          { exerciseId: "seated_calf_raise", sets: 3, repMin: 12, repMax: 20 },
          { exerciseId: "hanging_knee_raise", sets: 2, repMin: 10, repMax: 15 },
        ],
      },
    ],
  },
  {
    id: "fb3",
    name: "Full body (3 days)",
    daysPerWeek: 3,
    description: "Three sessions, e.g. Mon/Wed/Fri. The easiest one to stick to.",
    days: [
      {
        key: "full_a",
        name: "Full body A",
        focus: "Squat · Press · Pull",
        exercises: [
          { exerciseId: "back_squat", sets: 3, repMin: 6, repMax: 10, alternatives: ["hack_squat", "leg_press"] },
          { exerciseId: "bench_press", sets: 3, repMin: 6, repMax: 10, alternatives: ["machine_chest_press"] },
          { exerciseId: "lat_pulldown", sets: 3, repMin: 8, repMax: 12, alternatives: ["pull_ups"] },
          { exerciseId: "seated_leg_curl", sets: 2, repMin: 10, repMax: 15 },
          { exerciseId: "db_lateral_raise", sets: 2, repMin: 12, repMax: 20 },
          { exerciseId: "standing_calf_raise", sets: 2, repMin: 10, repMax: 15 },
        ],
      },
      {
        key: "full_b",
        name: "Full body B",
        focus: "Hinge · Incline · Row",
        exercises: [
          { exerciseId: "rdl", sets: 3, repMin: 8, repMax: 10 },
          { exerciseId: "incline_db_press", sets: 3, repMin: 8, repMax: 12 },
          { exerciseId: "chest_supported_row", sets: 3, repMin: 8, repMax: 12 },
          { exerciseId: "leg_press", sets: 2, repMin: 10, repMax: 15 },
          { exerciseId: "incline_db_curl", sets: 2, repMin: 8, repMax: 12 },
          { exerciseId: "rope_pushdown", sets: 2, repMin: 10, repMax: 15 },
        ],
      },
      {
        key: "full_c",
        name: "Full body C",
        focus: "Single-leg · Shoulders · Back",
        exercises: [
          { exerciseId: "bulgarian_split_squat", sets: 3, repMin: 8, repMax: 12 },
          { exerciseId: "machine_shoulder_press", sets: 3, repMin: 8, repMax: 12 },
          { exerciseId: "one_arm_db_row", sets: 3, repMin: 8, repMax: 12 },
          { exerciseId: "lying_leg_curl", sets: 2, repMin: 10, repMax: 15 },
          { exerciseId: "reverse_pec_deck", sets: 2, repMin: 12, repMax: 20 },
          { exerciseId: "cable_crunch", sets: 2, repMin: 12, repMax: 20 },
        ],
      },
    ],
  },
];

// Exercises someone typed in themselves get an id derived from the name, so
// logging "Smith squat" twice lands on the same progress chart.
export function customExerciseId(name: string): string {
  return "custom:" + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
