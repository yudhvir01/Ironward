import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BackIcon } from "../components/Icons";
import { useActiveProgram, useSavePlan, useWorkouts } from "../hooks/useData";
import { buildPlanPrompt, copyText, parsePlanAnswer, type ParsedPlan, type PlanAnswers } from "../lib/ai";
import { loadExerciseDb } from "../lib/exerciseDb";
import { defFor, repRange } from "../lib/program";

const AI_LINKS = [
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Claude", url: "https://claude.ai/new" },
  { name: "Gemini", url: "https://gemini.google.com/app" },
];

// Three steps on one page: answer → copy prompt → paste answer.
export function AiPlan() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: workouts = [] } = useWorkouts();
  const { setActive } = useActiveProgram();
  const save = useSavePlan();
  const [step, setStep] = useState<1 | 2 | 3>(params.has("paste") ? 3 : 1);
  const [answers, setAnswers] = useState<PlanAnswers>({
    goal: "Build muscle",
    daysPerWeek: 4,
    minutes: 60,
    experience: "6–12 months",
    equipment: "Full commercial gym",
    focus: "",
    limits: "",
  });
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [parsed, setParsed] = useState<ParsedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function makePrompt() {
    const text = buildPlanPrompt(answers, workouts);
    setPrompt(text);
    setCopied(await copyText(text));
    setStep(2);
  }

  async function read() {
    setError(null);
    // The extended library helps match names; without a connection the
    // plan still imports, just with fewer demos.
    const db = await loadExerciseDb().catch(() => undefined);
    try {
      setParsed(parsePlanAnswer(pasted, db));
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "That didn't look like a plan.");
    }
  }

  async function adoptPlan() {
    if (!parsed) return;
    await save.mutateAsync(parsed.program);
    setActive(parsed.program.id);
    navigate("/", { replace: true });
  }

  const set = <K extends keyof PlanAnswers>(k: K, v: PlanAnswers[K]) => setAnswers((a) => ({ ...a, [k]: v }));

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-center gap-2 pt-6">
        <Link to="/plans" className="-ml-2 rounded-full p-2 text-muted-foreground" aria-label="Back">
          <BackIcon />
        </Link>
        <h1 className="font-display text-2xl font-black">AI coach</h1>
      </header>

      <ol className="flex gap-2 text-xs font-bold">
        {["Answer", "Copy prompt", "Paste answer"].map((label, i) => (
          <li key={label} className="flex-1">
            <button
              className={`w-full rounded-full py-2 ${step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}
              onClick={() => (i + 1 < step || prompt || i === 2) && setStep((i + 1) as 1 | 2 | 3)}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="card animate-in space-y-4 p-4">
          <Choice label="Goal" value={answers.goal} options={["Build muscle", "Get stronger", "Lose fat, keep muscle", "General fitness"]} onChange={(v) => set("goal", v)} />
          <Choice label="Days per week" value={String(answers.daysPerWeek)} options={["3", "4", "5", "6"]} onChange={(v) => set("daysPerWeek", Number(v))} />
          <Choice label="Minutes per session" value={String(answers.minutes)} options={["45", "60", "75", "90"]} onChange={(v) => set("minutes", Number(v))} />
          <Choice label="Training experience" value={answers.experience} options={["Under 6 months", "6–12 months", "1–3 years", "3+ years"]} onChange={(v) => set("experience", v)} />
          <Choice label="Equipment" value={answers.equipment} options={["Full commercial gym", "Basic gym (no machines)", "Dumbbells only", "Home: bodyweight + bands"]} onChange={(v) => set("equipment", v)} />
          <label className="block">
            <span className="label">Priorities (optional)</span>
            <input className="field mt-1.5" placeholder="e.g. bigger arms, upper chest, wider back" value={answers.focus} onChange={(e) => set("focus", e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Injuries / avoid (optional)</span>
            <input className="field mt-1.5" placeholder="e.g. left shoulder pain on overhead pressing" value={answers.limits} onChange={(e) => set("limits", e.target.value)} />
          </label>
          <button className="btn-primary w-full py-4 text-base" onClick={makePrompt}>
            Make my prompt →
          </button>
          {workouts.length > 0 && <p className="text-center text-xs text-muted-foreground">Your recent best lifts are included so the AI can pitch it right.</p>}
        </section>
      )}

      {step === 2 && (
        <section className="card animate-in space-y-3 p-4">
          <p className="font-display text-xl font-black">{copied ? "Prompt copied ✓" : "Copy this prompt"}</p>
          <p className="text-sm text-muted-foreground">Paste it into any AI chat, wait for the answer, then copy the whole answer and come back.</p>
          <textarea className="field h-40 font-mono text-xs" readOnly value={prompt} onFocus={(e) => e.target.select()} />
          <button className="btn-ghost w-full" onClick={async () => setCopied(await copyText(prompt))}>
            {copied ? "Copied — copy again" : "Copy prompt"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            {AI_LINKS.map((l) => (
              <a key={l.name} href={l.url} target="_blank" rel="noreferrer" className="btn-ghost !py-2.5 text-xs">
                Open {l.name} ↗
              </a>
            ))}
          </div>
          <button className="btn-primary w-full py-4 text-base" onClick={() => setStep(3)}>
            I have the answer →
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="card animate-in space-y-3 p-4">
          <p className="font-display text-xl font-black">Paste the AI's answer</p>
          <textarea
            className="field h-44 font-mono text-xs"
            placeholder="Paste the whole reply here — the app finds the plan inside it."
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setParsed(null);
            }}
          />
          <div className="flex gap-2">
            <button
              className="btn-ghost flex-1"
              onClick={async () => {
                try {
                  setPasted(await navigator.clipboard.readText());
                  setParsed(null);
                } catch {
                  setError("Your browser blocked reading the clipboard — long-press the box and Paste instead.");
                }
              }}
            >
              Paste from clipboard
            </button>
            <button className="btn-primary flex-1" onClick={read} disabled={!pasted.trim()}>
              Read plan
            </button>
          </div>
          {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </section>
      )}

      {parsed && (
        <section className="card glow animate-in p-4">
          <p className="label !text-primary">Preview</p>
          <p className="font-display mt-1 text-2xl font-black">{parsed.program.name}</p>
          {parsed.program.description && <p className="mt-1 text-sm text-muted-foreground">{parsed.program.description}</p>}
          <div className="mt-4 space-y-4">
            {parsed.program.days.map((d) => (
              <div key={d.key}>
                <p className="font-bold">
                  {d.name} {d.focus && <span className="text-xs font-medium text-muted-foreground">· {d.focus}</span>}
                </p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {d.exercises.map((e, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {defFor(e).name}
                        {e.custom && <span className="ml-1.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">{e.custom.id.startsWith("db:") ? "library" : "new"}</span>}
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {e.sets} × {repRange(e)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {parsed.warnings.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl bg-warn/10 p-3 text-xs text-warn">
              {parsed.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
          <button className="btn-primary mt-4 w-full py-4 text-base" onClick={adoptPlan} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save & start using it"}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">You can tweak it any time under Plans → Edit.</p>
        </section>
      )}
    </div>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="label mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${value === o ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
