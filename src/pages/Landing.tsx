import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BodyMap } from "../components/BodyMap";
import { CheckIcon, TrophyIcon } from "../components/Icons";
import { InstallOptions } from "../components/InstallOptions";
import { Reveal } from "../components/Reveal";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { APP_MOTTO, APP_NAME } from "../lib/brand";

// The public front page for signed-out visitors on the web (the phone app
// goes straight to sign-in). The phone mockups are built from the app's
// own styles, so they always look like the real thing.

function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative w-[220px] shrink-0 rounded-[2.4rem] border-[7px] border-zinc-800 bg-background shadow-2xl shadow-black/40 sm:w-[250px] ${className}`}>
      <div className="absolute top-1.5 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-zinc-800" />
      <div className="overflow-hidden rounded-[1.9rem] px-3 pt-8 pb-4">{children}</div>
    </div>
  );
}

function LoggerScreen() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-display text-base font-black">Push A</span>
        <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-primary-foreground">Finish</span>
      </div>
      <div className="rounded-2xl border border-border bg-card p-2.5">
        <p className="font-display text-sm leading-tight font-black">Barbell bench press</p>
        <p className="mt-1.5 rounded-lg bg-primary-soft px-2 py-1 text-[9px] font-bold text-primary">↑ You hit 8 on every set — go up to 62.5 kg</p>
        {[
          ["62.5", "7", true],
          ["62.5", "6", true],
          ["62.5", "6", false],
        ].map(([w, r, done], i) => (
          <div key={i} className={`mt-1.5 grid grid-cols-[1rem_1fr_1fr_1.6rem] items-center gap-1.5 rounded-lg ${done ? "bg-done/10" : ""}`}>
            <span className="text-center text-[10px] font-bold text-muted-foreground">{i + 1}</span>
            <span className="rounded-md border border-border bg-background py-1 text-center text-[11px] font-bold">{w}</span>
            <span className={`rounded-md border border-border bg-background py-1 text-center text-[11px] font-bold ${done ? "" : "text-muted-foreground/60"}`}>{r}</span>
            <span className={`flex h-6 items-center justify-center rounded-md ${done ? "bg-done text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <CheckIcon size={12} />
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-foreground px-3 py-2 text-background">
        <p className="text-[8px] font-bold uppercase opacity-70">Rest</p>
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-black">0:24</span>
          <span className="flex gap-1 text-[9px] font-bold">
            <span className="rounded-full bg-background/15 px-1.5 py-1">−15</span>
            <span className="rounded-full bg-background/15 px-1.5 py-1">+15</span>
          </span>
        </div>
        <div className="mt-1 h-0.5 w-3/4 rounded-full bg-primary" />
      </div>
    </div>
  );
}

function TodayScreen() {
  return (
    <div className="space-y-2.5">
      <p className="font-display text-lg leading-none font-black">Let's move forward</p>
      <div className="flex justify-between">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span
            key={i}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${
              i < 3 ? "bg-primary text-primary-foreground" : i === 3 ? "ring-2 ring-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="glow rounded-2xl border border-border p-3">
        <p className="text-[8px] font-bold text-muted-foreground uppercase">Up next</p>
        <p className="font-display text-2xl leading-none font-black">Push B</p>
        {["Incline Smith press", "Flat dumbbell press", "Cable chest fly", "Lateral raise"].map((x) => (
          <p key={x} className="mt-1.5 flex justify-between text-[10px]">
            <span>{x}</span>
            <span className="text-muted-foreground">3 × 8–12</span>
          </p>
        ))}
        <p className="mt-2.5 rounded-xl bg-primary py-1.5 text-center text-[11px] font-black text-primary-foreground">Start Push B »</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-2.5">
        <p className="text-[8px] font-bold text-muted-foreground uppercase">Protein today</p>
        <p className="font-display text-base font-black">112 g</p>
        <div className="mt-1 h-1.5 rounded-full bg-muted">
          <div className="h-1.5 w-4/5 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ kicker, title, body, children, reverse = false }: { kicker: string; title: string; body: string; children: ReactNode; reverse?: boolean }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 py-10 md:grid-cols-2 md:gap-16 md:py-16">
      <Reveal className={`min-w-0 ${reverse ? "md:order-2" : ""}`}>
        <p className="label !text-primary">{kicker}</p>
        <h3 className="font-display mt-2 text-4xl leading-[0.95] font-black sm:text-5xl">{title}</h3>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{body}</p>
      </Reveal>
      <Reveal delay={120} className={`min-w-0 ${reverse ? "md:order-1" : ""}`}>
        <div className="card glow flex min-h-[19rem] items-center justify-center p-6 transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_var(--primary)] sm:p-10">{children}</div>
      </Reveal>
    </div>
  );
}

function Bubble({ children, tone = "bg-card", className = "" }: { children: ReactNode; tone?: string; className?: string }) {
  return <div className={`rounded-2xl border border-border px-4 py-3 text-sm font-semibold shadow-lg shadow-black/10 ${tone} ${className}`}>{children}</div>;
}

// Estimated 1-rep max over twelve sessions, as the Progress screen draws it.
function StrengthChart() {
  const points = [60, 61, 61.5, 61, 63, 64, 64, 65.5, 66, 67.5, 68, 70];
  const w = 320;
  const h = 150;
  const min = 58;
  const max = 72;
  const xy = points.map((v, i) => [12 + (i * (w - 24)) / (points.length - 1), h - 14 - ((v - min) / (max - min)) * (h - 28)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${h} L${xy[0][0].toFixed(1)},${h} Z`;
  const prs = [4, 7, 9, 11];
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="label">Bench press · est. 1RM</p>
          <p className="font-display text-4xl font-black">
            70 <span className="text-lg text-muted-foreground">kg</span>
          </p>
        </div>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">+10 kg in 12 sessions</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full" role="img" aria-label="Estimated one-rep max rising from 60 to 70 kg over twelve sessions">
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="var(--border)" strokeDasharray="3 5" />
        ))}
        <path d={area} fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {prs.map((i) => (
          <circle key={i} cx={xy[i][0]} cy={xy[i][1]} r="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="2.5" />
        ))}
      </svg>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-primary" /> New PR
      </p>
    </div>
  );
}

const STATS: [string, string][] = [
  ["0", "ads or trackers"],
  ["6", "questions to an AI plan"],
  ["100%", "works with no signal"],
  ["Your", "Drive keeps your data"],
];

const STEPS: { n: string; title: string; body: string }[] = [
  { n: "01", title: "Pick a plan", body: "A built-in split, your own, or one from the AI you already use." },
  { n: "02", title: "Tap Start, tick sets", body: "Every set shows what to beat from last time. The rest timer runs itself." },
  { n: "03", title: "Move forward", body: "Hit the target and it tells you to add weight. Watch the trend climb." },
];

const CARDS: { icon: string; title: string; body: string }[] = [
  { icon: "📋", title: "A real plan, built in", body: "Push/Pull/Legs, Upper/Lower or Full body — or build your own. It always knows which day is next." },
  { icon: "⏱️", title: "Rest timer & warm-ups", body: "30-second rest with ±15, alerts on the lock screen, and warm-up sets worked out for you." },
  { icon: "🎬", title: "How-to for every lift", body: "A looping demo, three form cues and a link to videos — right inside the workout." },
  { icon: "📶", title: "Works with no signal", body: "Basement gym? Log anyway. It syncs when you're back online." },
  { icon: "🍳", title: "Protein & body tracking", body: "One-tap protein (eggs, paneer, dal, whey…), body weight, tape measurements and private progress photos." },
  { icon: "🔁", title: "Bring your history", body: "Coming from Strong or Hevy? Import your CSV and keep every PR." },
];

export function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Hero */}
      <section className="relative">
        <div className="chevrons pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_10%,color-mix(in_oklab,var(--primary)_30%,transparent),transparent_70%)]" />
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <SiteHeader />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pt-6 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-12 md:pb-24">
          <div className="animate-in min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-bold">
              <span className="font-display font-black text-primary">»</span> {APP_MOTTO} Free · no ads · works offline
            </p>
            <h1 className="font-display mt-5 text-6xl leading-[0.88] font-black sm:text-8xl">
              Always moving <span className="ember-text">forward.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              {APP_NAME} tells you exactly what to lift today — one more rep, a little more weight — so every session is a step forward. Open it, tap Start, tick your sets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="btn-primary px-6 py-4 text-base transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_var(--primary)]">
                Start free »
              </Link>
              <a href="#download" className="btn-ghost px-6 py-4 text-base transition duration-300 hover:-translate-y-0.5">
                Get the app
              </a>
            </div>
          </div>
          {/* Two phones are wider than a small screen, so they're scaled to fit. */}
          <div className="relative flex min-w-0 justify-center pt-4 md:justify-end">
            <div className="pointer-events-none absolute inset-x-8 top-1/3 h-1/2 rounded-full bg-primary/25 blur-3xl" />
            <div className="-mb-20 flex origin-top scale-[0.78] justify-center min-[420px]:-mb-10 min-[420px]:scale-90 sm:mb-0 sm:scale-100">
              <div className="animate-float-slow -mr-10 mt-10">
                <Phone className="-rotate-[7deg]">
                  <TodayScreen />
                </Phone>
              </div>
              <div className="animate-float z-10">
                <Phone className="rotate-[5deg]">
                  <LoggerScreen />
                </Phone>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5">
        <Reveal className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-4">
          {STATS.map(([big, small]) => (
            <div key={small} className="bg-card px-5 py-6 text-center">
              <p className="font-display ember-text text-4xl font-black">{big}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{small}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-28 px-5 pt-20">
        <Reveal className="text-center">
          <p className="label !text-primary">» How it works</p>
          <h2 className="font-display mt-2 text-4xl font-black sm:text-5xl">Three steps. Every session.</h2>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 120}>
              <div className="card group relative h-full overflow-hidden p-6 transition duration-500 hover:-translate-y-1 hover:border-primary/50">
                <span className="font-display pointer-events-none absolute -top-4 -right-1 text-8xl font-black text-primary/10 transition-colors duration-500 group-hover:text-primary/20">
                  {step.n}
                </span>
                <span className="font-display flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)]">
                  {i + 1}
                </span>
                <h3 className="font-display mt-4 text-2xl font-black">{step.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-28 px-5 pt-20 text-center">
        <Reveal>
          <p className="label !text-primary">» Features</p>
          <h2 className="font-display mt-2 text-4xl font-black sm:text-5xl">Why {APP_NAME}?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Getting stronger is just moving forward, a little, every session. {APP_NAME} makes every step obvious — and the trail behind you visible.
          </p>
        </Reveal>
      </section>

      <FeatureRow
        kicker="» One step forward"
        title="It knows your next step"
        body="Every set shows today's target from last time. Hit the top of the rep range on every set and it tells you to go up. Stalled for three sessions? It suggests a lighter week, then you push on."
      >
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Bubble>Last time: 60 kg × 8, 8, 8</Bubble>
          <Bubble tone="bg-primary text-primary-foreground" className="self-end">
            ↑ Go up to 62.5 kg, aim for 6+
          </Bubble>
          <Bubble className="flex items-center gap-2">
            <TrophyIcon size={18} /> New PR — Bench press 62.5 kg
          </Bubble>
        </div>
      </FeatureRow>

      <FeatureRow
        reverse
        kicker="» Your AI coach"
        title="A plan from ChatGPT, Claude or Gemini"
        body="Answer six questions, copy the prompt into the AI you already use, paste the answer back — it becomes your plan. Later, it can review four weeks of your training the same way. No API key, no subscription."
      >
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Bubble>🎯 Build muscle · 4 days · 60 min · full gym</Bubble>
          <Bubble tone="bg-muted" className="self-end">
            📋 Prompt copied → paste into your AI
          </Bubble>
          <Bubble tone="bg-primary text-primary-foreground">✓ “Upper / Lower Hybrid” saved — Upper is up next</Bubble>
        </div>
      </FeatureRow>

      <FeatureRow
        reverse
        kicker="» Strength trend"
        title="Watch the line climb"
        body="An estimated one-rep max for every lift, session by session, with each new PR marked as it happens. Slow weeks show up too, so you know when to push and when to back off."
      >
        <StrengthChart />
      </FeatureRow>

      <FeatureRow
        kicker="» Proof of progress"
        title="See how far you've come"
        body="Hard sets per muscle against the 10–20 a week that research points to, strength trends for every lift, a calendar of training days, and a monthly recap card to share."
      >
        <div className="w-full max-w-xs">
          <BodyMap sets={{ chest: 14, shoulders: 12, triceps: 9, back: 16, rear_delts: 6, biceps: 11, quads: 12, hamstrings: 10, glutes: 7, calves: 4, abs: 6 }} />
        </div>
      </FeatureRow>

      {/* Cards */}
      <section className="px-5 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={(i % 3) * 100}>
              <div className="card group h-full p-6 transition duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-24px_var(--primary)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 text-2xl ring-1 ring-primary/20 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                  {c.icon}
                </span>
                <h3 className="font-display mt-4 text-xl font-black">{c.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Download */}
      <section id="download" className="mx-auto max-w-4xl scroll-mt-28 px-5 py-12">
        <Reveal>
          <h2 className="font-display text-center text-4xl font-black sm:text-5xl">Get the app</h2>
          <p className="mx-auto mt-3 mb-8 max-w-xl text-center text-muted-foreground">Straight from here — no app store account needed.</p>
          <InstallOptions />
        </Reveal>
      </section>

      {/* CTA */}
      <Reveal className="mx-5 mb-4 sm:mx-auto sm:max-w-6xl">
      <section className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground">
        <div className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="chevrons pointer-events-none absolute inset-0 opacity-60" />
        <h2 className="font-display relative text-4xl font-black sm:text-6xl">Onward.</h2>
        <p className="relative mt-3 font-semibold opacity-80">Your next step forward is one tap away. Sign in with Google, or just try it.</p>
        <Link to="/login" className="relative mt-7 inline-block rounded-2xl bg-background px-7 py-4 text-base font-black text-foreground transition duration-300 hover:-translate-y-0.5 hover:scale-[1.03]">
          Start free »
        </Link>
      </section>
      </Reveal>

      <SiteFooter />
    </div>
  );
}
