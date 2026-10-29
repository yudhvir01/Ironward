import { useEffect, useState } from "react";
import { copyText } from "../lib/ai";
import { bestDbMatch, entryById, framesFor, loadExerciseDb, type DbEntry } from "../lib/exerciseDb";
import { demoFrames, HOW_TO, videoUrl } from "../lib/howto";
import { saveMuscleFix } from "../lib/local";
import { MUSCLE_LABEL, MUSCLES } from "../lib/program";
import { openExternal } from "../lib/openUrl";
import type { LoggedExercise, Muscle } from "../lib/types";
import { ExerciseDemo } from "./ExerciseDemo";
import { Sheet } from "./Sheet";

const AI_LINKS = [
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Claude", url: "https://claude.ai/new" },
  { name: "Gemini", url: "https://gemini.google.com/app" },
];

// How-to for any exercise, best source first:
//   1. built-in: looping demo + three hand-written cues
//   2. the extended library (~870): its demo + step-by-step instructions,
//      found by id or a confident name match
//   3. nothing known: ask your AI, watch videos, and fix the muscle so
//      reports still count it right.
export function HowTo({ ex, onChange, onClose }: { ex: LoggedExercise; onChange?: (ex: LoggedExercise) => void; onClose: () => void }) {
  const builtIn = HOW_TO[ex.exerciseId];
  const [entry, setEntry] = useState<DbEntry | null | undefined>(builtIn ? null : undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (builtIn) return;
    loadExerciseDb()
      .then((db) => setEntry(entryById(db, ex.exerciseId) ?? bestDbMatch(db, ex.name)))
      .catch(() => setEntry(null));
  }, [builtIn, ex.exerciseId, ex.name]);

  const frames = demoFrames(ex.exerciseId) ?? (entry ? framesFor(entry) : null);
  const steps = builtIn ?? entry?.t ?? null;
  const matchedByName = entry && !ex.exerciseId.endsWith(entry.i);
  const fromLibrary = !EXERCISE_IDS.has(ex.exerciseId);

  function setMuscle(m: Muscle) {
    saveMuscleFix(ex.exerciseId, m);
    onChange?.({ ...ex, primary: m, secondary: ex.secondary.filter((x) => x !== m) });
  }

  const aiPrompt = `Explain how to do the exercise "${ex.name}" with good form, for someone in a commercial gym. Keep it short: 1) setup, 2) 3–5 form cues, 3) the most common mistake, 4) which muscles it mainly trains, 5) a safer or easier alternative.`;

  return (
    <Sheet title={ex.name} onClose={onClose}>
      {frames && (
        <div className="mb-4">
          <ExerciseDemo frames={frames} name={ex.name} />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">{MUSCLE_LABEL[ex.primary]}</span>
        {ex.secondary.map((m) => (
          <span key={m} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
            {MUSCLE_LABEL[m]}
          </span>
        ))}
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground capitalize">{ex.kind}</span>
      </div>

      {matchedByName && (
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          Showing the closest match from the exercise library: <b className="text-foreground">{entry!.n}</b>
        </p>
      )}

      {entry === undefined ? (
        <p className="mt-5 text-sm text-muted-foreground">Looking it up…</p>
      ) : steps ? (
        <ol className="mt-5 space-y-3">
          {steps.map((c, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black">{i + 1}</span>
              <span className="pt-0.5 text-sm leading-relaxed">{c}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border p-4">
          <p className="font-bold">No guide for this one yet</p>
          <p className="mt-1 text-sm text-muted-foreground">It's not in the library. Ask your AI for a quick form guide — the prompt is ready to paste:</p>
          <button className="btn-primary mt-3 w-full" onClick={async () => setCopied(await copyText(aiPrompt))}>
            {copied ? "Prompt copied ✓" : "✨ Copy “how do I do this?” prompt"}
          </button>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {AI_LINKS.map((l) => (
              <button key={l.name} className="btn-ghost !py-2 text-xs" onClick={() => openExternal(l.url)}>
                {l.name} ↗
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 rounded-2xl bg-muted p-3 text-sm">
        {ex.kind === "compound" ? "Big lift: stop with 2–3 reps left in the tank." : "Isolation: 1–2 reps left is fine."}
      </p>

      {fromLibrary && onChange && (
        <div className="mt-5">
          <p className="label">Main muscle</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Fix it if it's wrong — your weekly muscle reports use this.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MUSCLES.map((m) => (
              <button
                key={m}
                onClick={() => setMuscle(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${ex.primary === m ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
              >
                {MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="label mt-6">Videos</p>
      <button className="btn-ghost mt-2 w-full" onClick={() => openExternal(videoUrl(ex.name))}>
        ▶ Watch form videos on YouTube
      </button>
      {frames && <p className="mt-3 text-center text-[10px] text-muted-foreground">Demo photos: Free Exercise DB (public domain)</p>}
    </Sheet>
  );
}

const EXERCISE_IDS = new Set(Object.keys(HOW_TO));
