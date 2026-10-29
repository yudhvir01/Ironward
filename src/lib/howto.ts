// Three short cues per exercise — what a coach would shout across the
// floor — plus a link to form videos. Written for the built-in library;
// custom exercises just get the video link.
export const HOW_TO: Record<string, string[]> = {
  bench_press: ["Shoulder blades squeezed and down, feet planted", "Lower to mid-chest with elbows ~45° from the body", "Press up and slightly back; never bounce off the chest"],
  incline_db_press: ["Bench at 15–30°, not steeper", "Lower until you feel a chest stretch", "Press up and slightly in, wrists stacked over elbows"],
  incline_smith_press: ["Bench at 15–30°, bar over upper chest", "Touch lightly, don't rest on the chest", "Drive up without the shoulders rolling forward"],
  flat_db_press: ["Shoulder blades pinned, slight arch", "Lower the dumbbells to chest level", "Press up in a slight arc, stop just short of lockout clang"],
  machine_chest_press: ["Seat so handles line up with mid-chest", "Back flat on the pad", "Controlled 2-second lowering"],
  cable_fly: ["Slight bend in the elbows, locked in place", "Open wide until you feel a stretch", "Hug the cables together; squeeze for a beat"],
  pec_deck: ["Elbows slightly bent, chest up", "Bring the pads together with the chest, not the arms", "Slow return to a comfortable stretch"],
  dips: ["Lean slightly forward for chest", "Lower until the upper arm is about parallel", "Stop short of painful depth for the shoulders"],
  push_ups: ["Body in one straight line", "Hands just outside the shoulders", "Chest to a fist's height off the floor"],
  machine_shoulder_press: ["Handles start at about chin height", "Press up without arching the lower back", "Lower under control"],
  db_shoulder_press: ["Seat upright, core braced", "Dumbbells start at ear level", "Press overhead, don't clang them together"],
  cable_lateral_raise: ["Cable from the side, handle at the hip", "Lead with the elbow up and out", "Stop at shoulder height, lower slowly"],
  db_lateral_raise: ["Slight forward lean, soft elbows", "Raise out to the sides to shoulder height", "No swinging — lighter is better here"],
  reverse_pec_deck: ["Chest against the pad, arms straight-ish", "Sweep the arms back and out", "Don't shrug — keep the traps quiet"],
  cable_rear_delt_fly: ["Cross the cables, pull out and back", "Arms move in a wide arc", "Pause when hands are in line with the body"],
  face_pull: ["Rope at upper-chest to face height", "Pull to the face, hands going past the ears", "Squeeze the upper back, then return slowly"],
  rope_pushdown: ["Elbows pinned to your sides", "Push down and spread the rope at the bottom", "Let the forearms come up to ~90°, no higher"],
  cable_pushdown: ["Elbows pinned to your sides", "Lock out fully at the bottom", "Control the way up"],
  overhead_cable_ext: ["Face away from the cable, elbows by the head", "Let the hands go behind the head for a deep stretch", "Extend without the elbows flaring wide"],
  overhead_db_ext: ["Hold one dumbbell with both hands overhead", "Lower behind the head, elbows pointing up", "Extend fully; keep the ribs down"],
  skull_crusher: ["Upper arms angled slightly back", "Lower the bar toward the forehead / behind the head", "Only the elbows move"],
  pull_ups: ["Start from a dead hang, shoulders down", "Pull the chest toward the bar", "Lower all the way, under control"],
  lat_pulldown: ["Thighs locked under the pad", "Pull the bar to the upper chest", "Lead with the elbows down, little lean back"],
  close_grip_pulldown: ["Neutral close grip", "Pull the handle to the upper chest", "Feel the lats stretch at the top"],
  chest_supported_row: ["Chest stays on the pad the whole time", "Drive the elbows back", "Squeeze the shoulder blades, lower slowly"],
  seated_cable_row: ["Sit tall, knees soft", "Let the shoulders reach forward at the start", "Row to the stomach without rocking"],
  one_arm_db_row: ["Hand and knee on the bench, back flat", "Pull the elbow toward the hip", "Lower until the arm is long"],
  barbell_row: ["Hinge to ~45°, back flat", "Row the bar to the lower ribs", "No heaving — the torso stays still"],
  straight_arm_pulldown: ["Arms nearly straight, slight hinge", "Sweep the bar down to the thighs", "Feel the lats, not the triceps"],
  incline_db_curl: ["Bench at ~45°, arms hang straight down", "Curl without the elbows moving forward", "Full stretch at the bottom"],
  hammer_curl: ["Palms facing each other", "Elbows by your sides", "No swinging, lower slowly"],
  ez_preacher_curl: ["Armpits snug on the pad", "Lower to almost straight — not a painful lockout", "Curl up and squeeze"],
  cable_rope_hammer_curl: ["Rope on a low pulley, neutral grip", "Elbows pinned", "Squeeze at the top for a beat"],
  barbell_curl: ["Shoulder-width grip, elbows at your sides", "Curl without leaning back", "Control the way down"],
  back_squat: ["Bar on upper back, brace hard before each rep", "Knees track over the toes", "Sit down between the hips to a depth you control"],
  hack_squat: ["Back flat on the pad, feet mid-platform", "Lower as deep as you can control", "Drive through the whole foot"],
  leg_press: ["Hips and lower back stay on the seat", "Lower until just before the pelvis tucks", "Don't lock the knees hard at the top"],
  bulgarian_split_squat: ["Rear foot on the bench, front foot well forward", "Drop the back knee straight down", "Push through the front heel"],
  leg_extension: ["Knee lined up with the machine's pivot", "Extend smoothly, brief squeeze at the top", "Lower under control"],
  rdl: ["Soft knees, push the hips back", "Bar slides down the thighs, back flat", "Stop when the hamstrings are stretched, then drive the hips forward"],
  db_rdl: ["Dumbbells in front of the thighs", "Hips back, spine neutral", "Stand up by squeezing the glutes"],
  seated_leg_curl: ["Thigh pad snug, knee at the pivot", "Curl all the way, squeeze", "Slow return"],
  lying_leg_curl: ["Hips pressed into the pad", "Curl the heels toward the glutes", "Don't let the weight drop back"],
  hip_thrust: ["Upper back on the bench, bar/pad over the hips", "Chin tucked, drive the hips up", "Lock out with the glutes, not the lower back"],
  standing_calf_raise: ["Balls of the feet on the edge", "Pause in the deep stretch at the bottom", "Rise all the way up, no bouncing"],
  seated_calf_raise: ["Knees under the pad", "Full stretch at the bottom, pause", "Rise high, squeeze"],
  cable_crunch: ["Kneel, rope by the head", "Curl the ribs toward the hips", "Hips stay still — it's a spine curl"],
  hanging_knee_raise: ["Dead hang, shoulders active", "Curl the pelvis up, not just the knees", "Lower slowly without swinging"],
  plank: ["Elbows under shoulders", "Squeeze glutes, ribs down", "Straight line from head to heels"],
};

export function videoUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} proper form`)}`;
}

// Exercises with a two-frame demo in public/exercises/<id>-0.jpg / -1.jpg
// (start and end position), from Free Exercise DB — public domain
// (Unlicense), github.com/yuhonas/free-exercise-db.
export const DEMOS = new Set(Object.keys(HOW_TO));

export function demoFrames(id: string): [string, string] | null {
  return DEMOS.has(id) ? [`/exercises/${id}-0.jpg`, `/exercises/${id}-1.jpg`] : null;
}
