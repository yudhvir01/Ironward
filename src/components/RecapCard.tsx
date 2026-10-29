import { useEffect, useState } from "react";
import { useBodyWeights, useWorkouts } from "../hooks/useData";
import { drawRecap, monthRecap, shareRecap } from "../lib/recap";

export function RecapCard() {
  const { data: workouts = [] } = useWorkouts();
  const { data: weights = [] } = useBodyWeights();
  const [offset, setOffset] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const recap = monthRecap(workouts, weights, month.getFullYear(), month.getMonth());

  useEffect(() => {
    let alive = true;
    if (!recap.workouts) {
      setImage(null);
      return;
    }
    void drawRecap(recap).then((c) => {
      if (!alive) return;
      setCanvas(c);
      setImage(c.toDataURL("image/png"));
    });
    return () => {
      alive = false;
    };
    // The recap is derived from these; redraw only when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, weights, offset]);

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <p className="label">Monthly recap</p>
        <div className="flex items-center gap-1 text-sm font-bold">
          <button className="rounded-full px-2.5 py-1 active:bg-muted" onClick={() => setOffset((o) => o + 1)} aria-label="Previous month">
            ‹
          </button>
          <span className="min-w-28 text-center">{recap.label}</span>
          <button className="rounded-full px-2.5 py-1 active:bg-muted disabled:opacity-30" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label="Next month">
            ›
          </button>
        </div>
      </div>
      {image ? (
        <>
          <img src={image} alt={`Recap for ${recap.label}`} className="mt-3 w-full rounded-2xl" />
          <button
            className="btn-primary mt-3 w-full"
            onClick={async () => {
              if (!canvas) return;
              const result = await shareRecap(canvas, `recap ${recap.label}`).catch(() => null);
              setStatus(result === "downloaded" ? "Saved to your downloads." : null);
            }}
          >
            Share recap
          </button>
          {status && <p className="mt-2 text-center text-xs text-muted-foreground">{status}</p>}
        </>
      ) : (
        <p className="mt-3 rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">No workouts logged in {recap.label}.</p>
      )}
    </section>
  );
}
