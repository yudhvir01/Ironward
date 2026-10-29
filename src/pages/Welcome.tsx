import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReminderSettings } from "../components/ReminderSettings";
import { useActiveProgram } from "../hooks/useData";
import { APP_NAME } from "../lib/brand";
import { setOnboarded } from "../lib/local";
import { PROGRAMS } from "../lib/program";
import { getUnit, setUnit, type Unit } from "../lib/units";

// First launch: three quick choices, then straight to the first workout.
export function Welcome() {
  const navigate = useNavigate();
  const { setActive } = useActiveProgram();
  const [step, setStep] = useState(0);
  const [unit, setUnitState] = useState<Unit>(getUnit());
  const [plan, setPlan] = useState<string>(PROGRAMS[0].id);

  function done(to = "/") {
    setOnboarded();
    navigate(to, { replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_45%_at_80%_0%,color-mix(in_oklab,var(--primary)_25%,transparent),transparent_70%)]" />
      <div className="pt-safe relative mx-auto flex min-h-screen max-w-md flex-col px-5 pt-10 pb-8">
        <div className="mb-8 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-in flex flex-1 flex-col">
            <h1 className="font-display text-5xl leading-[0.95] font-black">Welcome to {APP_NAME}</h1>
            <p className="mt-3 text-lg text-muted-foreground">Two quick questions and you're lifting. First — which weights does your gym use?</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {(["kg", "lb"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnitState(u)}
                  className={`card p-6 text-center ${unit === u ? "border-primary bg-primary-soft" : ""}`}
                >
                  <span className="font-display block text-4xl font-black">{u}</span>
                  <span className="text-xs text-muted-foreground">{u === "kg" ? "Kilograms" : "Pounds"}</span>
                </button>
              ))}
            </div>
            <button
              className="btn-primary mt-auto w-full py-4 text-base"
              onClick={() => {
                setUnit(unit);
                setStep(1);
              }}
            >
              Next →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-in flex flex-1 flex-col">
            <h1 className="font-display text-4xl leading-[0.95] font-black">Pick your plan</h1>
            <p className="mt-2 text-muted-foreground">You can change it any time.</p>
            <div className="mt-6 space-y-2">
              {PROGRAMS.map((p) => (
                <button key={p.id} onClick={() => setPlan(p.id)} className={`card w-full p-4 text-left ${plan === p.id ? "border-primary bg-primary-soft" : ""}`}>
                  <span className="font-display block text-lg font-black">{p.name}</span>
                  <span className="block text-sm text-muted-foreground">{p.description}</span>
                </button>
              ))}
              <button className="card w-full border-dashed p-4 text-left" onClick={() => done("/plans/ai")}>
                <span className="font-display block text-lg font-black">✨ Let AI make one for me</span>
                <span className="block text-sm text-muted-foreground">Answer 6 questions, paste into ChatGPT / Claude / Gemini.</span>
              </button>
              <button className="w-full py-2 text-sm font-semibold text-primary" onClick={() => done("/import")}>
                Coming from Strong or Hevy? Import your history →
              </button>
            </div>
            <button
              className="btn-primary mt-auto w-full py-4 text-base"
              onClick={() => {
                setActive(plan);
                setStep(2);
              }}
            >
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in flex flex-1 flex-col">
            <h1 className="font-display text-4xl leading-[0.95] font-black">Want a nudge on training days?</h1>
            <p className="mt-2 text-muted-foreground">Optional. Pick your days and a time — or skip and set it later in Settings.</p>
            <div className="card mt-6 p-4">
              <ReminderSettings />
            </div>
            <button className="btn-primary mt-auto w-full py-4 text-base" onClick={() => done()}>
              Onward »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
