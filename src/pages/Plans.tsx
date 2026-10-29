import { useConfirm } from "../components/ConfirmDialog";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/AppShell";
import { useActiveProgram, useDeletePlan } from "../hooks/useData";
import { PROGRAMS, type Program } from "../lib/program";

export function Plans() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { program: active, plans, setActive } = useActiveProgram();
  const remove = useDeletePlan();

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Plans" subtitle="Pick what the Train tab follows." />

      <Link to="/plans/ai" className="card glow animate-in block p-5">
        <p className="label !text-primary">New · AI coach</p>
        <p className="font-display mt-1 text-2xl font-black">Get a plan made for you</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer 6 quick questions, copy the prompt into ChatGPT, Claude or Gemini, paste the answer back. Done.
        </p>
      </Link>

      {plans.length > 0 && (
        <section>
          <p className="label mb-2 px-1">Your plans</p>
          <div className="space-y-2">
            {plans.map((p) => (
              <PlanRow
                key={p.id}
                plan={p}
                active={p.id === active.id}
                onUse={() => setActive(p.id)}
                actions={
                  <>
                    <Link to={`/plans/${p.id}`} className="text-xs font-bold text-primary">
                      Edit
                    </Link>
                    <button
                      className="text-xs font-bold text-destructive"
                      onClick={async () => (await confirm({ title: `Delete “${p.name}”?`, message: "Workouts you logged with it stay.", confirmLabel: "Delete plan", tone: "danger" })) && remove.mutate(p.id)}
                    >
                      Delete
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="label mb-2 px-1">Built in</p>
        <div className="space-y-2">
          {PROGRAMS.map((p) => (
            <PlanRow
              key={p.id}
              plan={p}
              active={p.id === active.id}
              onUse={() => setActive(p.id)}
              actions={
                <Link to={`/plans/copy:${p.id}`} className="text-xs font-bold text-primary">
                  Copy &amp; edit
                </Link>
              }
            />
          ))}
        </div>
      </section>

      <button className="btn-ghost w-full py-4" onClick={() => navigate("/plans/new")}>
        + Build a plan from scratch
      </button>
    </div>
  );
}

function PlanRow({ plan, active, onUse, actions }: { plan: Program; active: boolean; onUse: () => void; actions: React.ReactNode }) {
  return (
    <div className={`card animate-in p-4 ${active ? "border-primary" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight font-black">{plan.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {plan.days.length} sessions · {plan.days.map((d) => d.name).join(" · ")}
          </p>
          {plan.description && <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>}
        </div>
        {active ? (
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Active</span>
        ) : (
          <button className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold" onClick={onUse}>
            Use
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-4">{actions}</div>
    </div>
  );
}
