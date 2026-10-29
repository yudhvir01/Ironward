import { Link } from "react-router-dom";
import { PageHeader } from "../components/AppShell";
import { APP_NAME } from "../lib/brand";

// The plan's rules, short enough to read between sets.
const rules: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Beat last time",
    body: (
      <>
        <p>Every exercise has a rep range, like 8–10. Use one weight until you hit the top of the range on <b>every</b> set — then go up by the smallest jump (usually 2.5 kg).</p>
        <p className="mt-2 rounded-lg bg-muted p-2 text-xs tabular-nums">8, 8, 7 → 9, 8, 8 → 10, 10, 10 → add weight</p>
        <p className="mt-2">{APP_NAME} does this for you: the grey numbers in each box are what to aim for today.</p>
      </>
    ),
  },
  {
    title: "2. Know your RIR",
    body: (
      <>
        <p><b>RIR = reps in reserve</b> — how many more clean reps you could have done. Tap the RIR box on a set to note it (optional).</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Bench, squat, RDL and other big lifts: stop at <b>2–3 RIR</b>.</li>
          <li>Machines and isolation work: <b>1–3 RIR</b>.</li>
          <li>Don't take heavy compound lifts to failure. Hard sets, not broken form.</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. Rest long enough",
    body: (
      <>
        <ul className="list-disc space-y-1 pl-5">
          <li>Big lifts, rows, pulldowns, presses: <b>2–3 min</b></li>
          <li>Curls, raises, triceps, calves, abs: <b>60–120 s</b></li>
        </ul>
        <p className="mt-2">The timer starts at 30 s — tap +15 until you feel ready, or change the default in Settings.</p>
      </>
    ),
  },
  {
    title: "4. Warm up",
    body: (
      <p>5 minutes of easy cardio, then 2–4 lighter ramp-up sets before your first heavy lift (e.g. empty bar → 30 kg → 45 kg → working 60 kg). Don't log warm-ups as sets.</p>
    ),
  },
  {
    title: "5. The first 8 weeks",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Weeks 1–2:</b> learn the exercises, find working weights, 2–3 RIR.</li>
        <li><b>Weeks 3–4:</b> start adding reps and weight.</li>
        <li><b>Weeks 5–6:</b> keep progressing. Add sets only if recovery is good and progress stalls.</li>
        <li><b>Weeks 7–8:</b> review strength, body weight and fatigue on the Progress tab.</li>
      </ul>
    ),
  },
  {
    title: "6. Eat, sleep, repeat",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Protein:</b> 1.6–2.2 g per kg of body weight a day — eggs, milk, curd, paneer, chicken, fish, soy chunks, tofu, dal, whey.</li>
        <li><b>Calories:</b> maintenance or a small surplus to build muscle.</li>
        <li><b>Sleep:</b> 7–9 hours.</li>
      </ul>
    ),
  },
  {
    title: "7. Missed a day?",
    body: <p>Just do the next session in order — {APP_NAME} already shows it. Never cram two sessions into one. Severe soreness, sliding performance or joint pain means cut back and fix the cause.</p>,
  },
];

export function Guide() {
  return (
    <div className="space-y-3 pb-6">
      <PageHeader title="How to train" subtitle="The whole plan in 2 minutes." />
      {rules.map((r) => (
        <section key={r.title} className="card p-4 text-sm leading-relaxed">
          <h2 className="font-display mb-2 text-lg font-black">{r.title}</h2>
          {r.body}
        </section>
      ))}
      <p className="px-1 text-xs text-muted-foreground">
        Based on the ACSM 2026 resistance-training position stand and rest-interval research. Not medical advice — if something hurts sharply, stop and get it checked.
      </p>
      <Link to="/" className="btn-primary w-full">
        Got it — let's train
      </Link>
    </div>
  );
}
