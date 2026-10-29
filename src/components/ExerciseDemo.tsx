import { useEffect, useState } from "react";

// A GIF-style loop built from two photos (start and end of the rep),
// cross-fading so the movement reads at a glance. Pauses for people who
// prefer reduced motion — they get both frames side by side instead.
export function ExerciseDemo({ frames, name }: { frames: [string, string]; name: string }) {
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setFrame((f) => 1 - f), 900);
    return () => window.clearInterval(id);
  }, [reduced]);

  if (failed) return null;

  if (reduced) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {frames.map((src, i) => (
          <img key={src} src={src} alt={`${name} — ${i ? "end" : "start"} position`} className="aspect-[3/2] w-full rounded-2xl bg-muted object-cover" onError={() => setFailed(true)} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-muted">
      {frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? `${name} demonstration` : ""}
          aria-hidden={i === 1}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: frame === i ? 1 : 0 }}
        />
      ))}
      <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
        {frame === 0 ? "Start" : "Finish"}
      </span>
    </div>
  );
}
