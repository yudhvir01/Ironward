import { useState } from "react";
import { Link } from "react-router-dom";
import { useActiveProgram, useBodyWeights, useWorkouts } from "../hooks/useData";
import { buildReviewPrompt, copyText } from "../lib/ai";

// The second half of "bring your own AI": hand the assistant four weeks of
// numbers, get advice back — and, if it suggests a new plan, paste that in.
export function AiReviewCard() {
  const { data: workouts = [] } = useWorkouts();
  const { data: weights = [] } = useBodyWeights();
  const { program } = useActiveProgram();
  const [copied, setCopied] = useState(false);

  return (
    <section className="card glow p-4">
      <p className="label !text-primary">AI coach</p>
      <p className="font-display mt-1 text-xl font-black">Get your training reviewed</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Copies a summary of your last 4 weeks — lifts, sets per muscle, body weight — as a prompt. Paste it into ChatGPT, Claude or Gemini.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-primary" onClick={async () => setCopied(await copyText(buildReviewPrompt(workouts, weights, program)))}>
          {copied ? "Copied ✓" : "Copy prompt"}
        </button>
        <Link to="/plans/ai?paste=1" className="btn-ghost">
          Paste new plan
        </Link>
      </div>
    </section>
  );
}
