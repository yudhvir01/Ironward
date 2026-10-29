import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BodyMap } from "../components/BodyMap";
import { CheckIcon, TrophyIcon } from "../components/Icons";
import { InstallOptions } from "../components/InstallOptions";
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
    <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-10 md:grid-cols-2 md:gap-16 md:py-16">
      <div className={reverse ? "md:order-2" : ""}>
        <p className="label !text-primary">{kicker}</p>
        <h3 className="font-display mt-2 text-4xl leading-[0.95] font-black sm:text-5xl">{title}</h3>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div className={`card glow flex min-h-[19rem] items-center justify-center p-6 sm:p-10 ${reverse ? "md:order-1" : ""}`}>{children}</div>
    </div>
  );
}

function Bubble({ children, tone = "bg-card", className = "" }: { children: ReactNode; tone?: string; className?: string }) {
  return <div className={`rounded-2xl border border-border px-4 py-3 text-sm font-semibold shadow-lg shadow-black/10 ${tone} ${className}`}>{children}</div>;
}

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
        <SiteHeader />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pt-8 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-16 md:pb-24">
          <div className="animate-in">
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
              <Link to="/login" className="btn-primary px-6 py-4 text-base">
                Start free »
              </Link>
              <a href="#download" className="btn-ghost px-6 py-4 text-base">
                Get the app
              </a>
            </div>
          </div>
          <div className="relative flex justify-center pt-4 md:justify-end">
            <Phone className="-mr-10 mt-10 -rotate-[7deg]">
              <TodayScreen />
            </Phone>
            <Phone className="z-10 rotate-[5deg]">
              <LoggerScreen />
            </Phone>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-4 px-5 pt-8 text-center">
        <h2 className="font-display text-4xl font-black sm:text-5xl">Why {APP_NAME}?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Getting stronger is just moving forward, a little, every session. {APP_NAME} makes every step obvious — and the trail behind you visible.
        </p>
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
          {CARDS.map((c) => (
            <div key={c.title} className="card p-6 transition hover:-translate-y-0.5">
              <span className="text-3xl">{c.icon}</span>
              <h3 className="font-display mt-3 text-xl font-black">{c.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Download */}
      <section id="download" className="mx-auto max-w-4xl scroll-mt-4 px-5 py-12">
        <h2 className="font-display text-center text-4xl font-black sm:text-5xl">Get the app</h2>
        <p className="mx-auto mt-3 mb-8 max-w-xl text-center text-muted-foreground">Straight from here — no app store account needed.</p>
        <InstallOptions />
      </section>

      {/* CTA */}
      <section className="relative mx-5 mb-4 overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground sm:mx-auto sm:max-w-6xl">
        <div className="chevrons pointer-events-none absolute inset-0 opacity-60" />
        <h2 className="font-display relative text-4xl font-black sm:text-6xl">Onward.</h2>
        <p className="relative mt-3 font-semibold opacity-80">Your next step forward is one tap away. Create an account, or just try it.</p>
        <Link to="/login" className="relative mt-7 inline-block rounded-2xl bg-background px-7 py-4 text-base font-black text-foreground transition hover:scale-[1.03]">
          Start free »
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
