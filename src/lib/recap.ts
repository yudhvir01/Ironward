import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { APP_NAME, APP_TAGLINE } from "./brand";
import { fmtWeight } from "./units";
import { MUSCLE_LABEL } from "./program";
import { bestE1rm, dayOf, durationMinutes, localDay, fmtVolume, muscleSets, prsIn, round1, workoutSetCount, workoutVolume } from "./stats";
import type { BodyWeight, Muscle, Workout } from "./types";

export interface Recap {
  label: string; // "October 2026"
  workouts: number;
  days: number;
  sets: number;
  volume: number;
  hours: number;
  prs: number;
  topMuscle: string | null;
  bestLift: { name: string; gain: number } | null;
  bodyweight: number | null; // change in kg
}

export function monthRecap(all: Workout[], weights: BodyWeight[], year: number, month: number): Recap {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);
  const inMonth = all.filter((w) => {
    const t = Date.parse(w.started_at);
    return t >= from.getTime() && t < to.getTime();
  });

  const sets = muscleSets(inMonth, from, to);
  const topMuscle = (Object.entries(sets) as [Muscle, number][]).sort((a, b) => b[1] - a[1])[0];

  // Biggest estimated-1RM gain from first to last session this month.
  let bestLift: Recap["bestLift"] = null;
  const byExercise = new Map<string, { name: string; first: number; last: number }>();
  for (const w of [...inMonth].reverse()) {
    for (const ex of w.exercises) {
      const v = bestE1rm(ex);
      if (!v) continue;
      const e = byExercise.get(ex.exerciseId);
      if (e) e.last = v;
      else byExercise.set(ex.exerciseId, { name: ex.name, first: v, last: v });
    }
  }
  for (const e of byExercise.values()) {
    const gain = round1(e.last - e.first);
    if (gain > 0 && (!bestLift || gain > bestLift.gain)) bestLift = { name: e.name, gain };
  }

  const monthWeights = weights.filter((b) => b.day >= localDay(from) && b.day < localDay(to));
  const bw = monthWeights.length >= 2 ? round1(monthWeights[0].kg - monthWeights[monthWeights.length - 1].kg) : null;

  return {
    label: from.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    workouts: inMonth.length,
    days: new Set(inMonth.map((w) => dayOf(w.started_at))).size,
    sets: inMonth.reduce((n, w) => n + workoutSetCount(w), 0),
    volume: inMonth.reduce((n, w) => n + workoutVolume(w), 0),
    hours: round1(inMonth.reduce((n, w) => n + (durationMinutes(w) ?? 0), 0) / 60),
    prs: inMonth.reduce((n, w) => n + prsIn(w, all).length, 0),
    topMuscle: topMuscle ? MUSCLE_LABEL[topMuscle[0]] : null,
    bestLift,
    bodyweight: bw,
  };
}

// A 1080×1350 card (Instagram portrait) drawn on a canvas, so it's an
// image people can post anywhere.
export async function drawRecap(r: Recap): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load('italic 900 120px "Archivo"'), document.fonts.load('600 40px "Inter"')]).catch(() => undefined);
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const ember = "#ff6b1a";
  const display = (size: number) => `italic 900 ${size}px Archivo, Inter, sans-serif`;
  const body = (size: number, weight = 600) => `${weight} ${size}px Inter, sans-serif`;

  g.fillStyle = "#09090b";
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W, 0, 0, W, 0, 900);
  glow.addColorStop(0, "rgba(255,107,26,0.38)");
  glow.addColorStop(1, "rgba(255,107,26,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  const pad = 80;
  g.fillStyle = ember;
  g.font = body(34, 800);
  g.fillText(`${APP_NAME.toUpperCase()} · MONTHLY RECAP`, pad, 130);
  g.fillStyle = "#fafafa";
  g.font = display(110);
  g.fillText(r.label.split(" ")[0], pad, 260);
  g.fillStyle = "#71717a";
  g.font = display(64);
  g.fillText(r.label.split(" ")[1] ?? "", pad, 340);

  // 2×2 big stats
  const stats: [string, string][] = [
    [String(r.workouts), "workouts"],
    [String(r.sets), "hard sets"],
    [fmtVolume(r.volume), "lifted"],
    [r.hours ? `${r.hours}h` : `${r.days}`, r.hours ? "under the bar" : "days trained"],
  ];
  const boxW = (W - pad * 2 - 30) / 2;
  stats.forEach(([value, label], i) => {
    const x = pad + (i % 2) * (boxW + 30);
    const y = 420 + Math.floor(i / 2) * 250;
    g.fillStyle = "#18181b";
    roundRect(g, x, y, boxW, 220, 40);
    g.fill();
    g.fillStyle = "#fafafa";
    g.font = display(96);
    g.fillText(value, x + 44, y + 130);
    g.fillStyle = "#a1a1aa";
    g.font = body(34);
    g.fillText(label, x + 46, y + 182);
  });

  // Highlights
  const lines: [string, string][] = [];
  if (r.prs) lines.push(["🏆", `${r.prs} personal record${r.prs > 1 ? "s" : ""}`]);
  if (r.bestLift) lines.push(["📈", `${r.bestLift.name} +${fmtWeight(r.bestLift.gain)} (est. 1RM)`]);
  if (r.topMuscle) lines.push(["💪", `Most trained: ${r.topMuscle}`]);
  if (r.bodyweight !== null) lines.push(["⚖️", `Body weight ${r.bodyweight >= 0 ? "+" : ""}${fmtWeight(r.bodyweight)}`]);
  g.font = body(38, 700);
  lines.slice(0, 4).forEach(([icon, text], i) => {
    const y = 980 + i * 70;
    g.fillStyle = "#fafafa";
    g.fillText(icon, pad, y);
    g.fillText(fit(g, text, W - pad * 2 - 70), pad + 70, y);
  });

  // Footer: the motto with forward chevrons.
  g.fillStyle = ember;
  roundRect(g, pad, H - 140, W - pad * 2, 6, 3);
  g.fill();
  g.font = display(40);
  g.fillText(`» ${APP_TAGLINE}`, pad, H - 70);
  return c;
}

function fit(g: CanvasRenderingContext2D, text: string, max: number): string {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 3 && g.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export async function shareRecap(canvas: HTMLCanvasElement, name: string): Promise<"shared" | "downloaded"> {
  const fileName = `${name.replace(/\s+/g, "-").toLowerCase()}.png`;
  if (Capacitor.isNativePlatform()) {
    const data = canvas.toDataURL("image/png").split(",")[1];
    const { uri } = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
    await Share.share({ title: "My month in the gym", files: [uri] });
    return "shared";
  }
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My month in the gym" });
      return "shared";
    } catch {
      // Cancelled the share sheet — fall through to a download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
