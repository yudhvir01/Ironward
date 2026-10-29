# Ironward

<!-- Brand: ember #ff6b1a on graphite #0c0d0f, Archivo italic display, forward chevrons ». Mark = iron plate + collar driving into an arrow. Name/tagline live in src/lib/brand.ts. -->

**Always moving forward.** Onward with iron — the gym log that tells you exactly what to lift next.

A dead-simple gym log — web app + Android/iOS app (Capacitor) — built the same way as Waypoint: React 19 + Vite + Tailwind 4, one `Backend` interface (`src/lib/backend/`) with two implementations:

- **No account** — data lives in that browser/phone's IndexedDB.
- **Account** — email + password on a Supabase project baked in at build time, so anyone who opens the site can sign up and their logs follow them across devices. Row-level security keeps each person's logs private.

## What it does

- **Train** — shows the next session in your plan (it resumes the sequence if you skip a day — never crams), one big Start button, or pick any day / an empty workout.
- **Logger** — every set is weight × reps × optional RIR. Grey numbers are today's target: same weight +1 rep, or **+2.5 kg once you hit the top of the rep range on every set** (double progression). Tick ✓ with empty boxes to accept the target. Tap an exercise name to swap it (plan's swaps first), add/remove sets and exercises, add your own exercises. The in-progress workout is kept on the device, so a refresh or closing the app loses nothing.
- **Rest timer** — starts when you tick a set (2½ min big lifts, 90 s isolation), ±15 s / skip, vibrates + beeps when done.
- **Finish** — summary with sets, volume, time and **PRs** (heaviest weight / best estimated 1RM).
- **History** — by month; open a workout to view, edit or delete it.
- **Progress** (the reports) — workouts/sets/volume per week (10 weeks), **hard sets per muscle per week vs the 10–20 range**, per-exercise **estimated 1RM chart** + recent top sets, **stalled lifts** (no progress in 3 sessions), and a **body-weight** log with 4-week change.
- **Plans** — Push/Pull/Legs 6-day (the default), Upper/Lower 4-day, Full body 3-day (`src/lib/program.ts`), plus your own: copy & edit a built-in one or build from scratch (days, exercises, sets, rep ranges). Saved per account.
- **AI coach (bring your own AI)** — answer 6 questions → the app writes a prompt (including your recent best lifts) → paste it into ChatGPT / Claude / Gemini → paste the answer back → preview → it becomes your plan. The parser (`src/lib/ai.ts`) digs the JSON out of a whole chat reply, tolerates trailing commas and smart quotes, matches exercise names to the library so history carries over, and adds unknown ones as custom exercises. **Progress → "Get your training reviewed"** copies a 4-week summary prompt; if the AI suggests a new plan, paste it in the same way. No API key or server needed.
- **Logging speed-ups** — supersets (rest starts after the round), tap a set number to mark it **F**ailure or **D**rop set, a note per exercise that shows again next time, the next set copies the weight you just used, swaps can be remembered for that plan day, and ±15 on a rest becomes that exercise's rest.
- **Bodyweight lifts** — pull-ups, dips, push-ups etc. are tracked by reps (the weight box is "+kg" added weight), with rep PRs and rep charts.
- **kg or lb**, and a "smallest weight jump" setting so suggestions are always loadable.
- **Works offline** — data is cached on the device; a workout finished with no signal is queued and synced later.
- **Easy start** — 3-step welcome (units → plan or AI → reminders), forgot password, optional Google sign-in (`VITE_ENABLE_GOOGLE=1` + Google provider on in Supabase), **import from Strong or Hevy** (CSV; re-importing doesn't duplicate), and training-day reminders in the phone app.
- **More reports** — calendar view, front/back muscle heat map, deload-week suggestion when lifts stall (half the sets, ~10% lighter), protein tracker with Indian food shortcuts, tape measurements, and private progress photos (kept only on the phone).
- **~870 more exercises** — the "Add exercise" search also covers the extended library (Free Exercise DB, public domain: `public/exercise-db.json`, rebuilt with `scripts/build-exercise-db.mjs`), each with a demo and step-by-step how-to. AI plans and Strong/Hevy imports match names against it too. Anything still unknown gets an "ask your AI how to do this" prompt, YouTube link, and a muscle picker so reports stay accurate.
- **Gym-floor tools** — warm-up ramp for big lifts (bar → 50% → 70% → 85%), plate calculator (per-side plates, 20/15/10 kg bar), "How to do it" cues + form-video link for every exercise.
- **Rest alerts in the background** — a scheduled notification when rest ends, even with the phone locked (Android/iOS); a page notification on the web.
- **Monthly recap** — a 1080×1350 image (workouts, sets, kg lifted, hours, PRs, best lift, body weight) to share or save.
- **Install page** at `/download` — install the web app, download the APK, or iPhone "Add to Home Screen" steps.
- **Self-updating app** — new web bundles download in the background and apply on next launch, with automatic rollback (ported from Waypoint). A new APK is offered as a download.
- **Guide** — the training rules (progressive overload, RIR, rest, warm-up, first 8 weeks, protein/sleep) in 2 minutes.
- **Your data** — CSV export (one row per set), JSON backup/restore, move no-account logs into an account, delete account.

## Run it

```bash
npm install
npm run dev
```

Works immediately with no account (no setup needed).

## Turn on accounts (so anyone can sign up)

1. Create a free project at [supabase.com](https://supabase.com).
2. SQL Editor → paste [`supabase/setup.sql`](supabase/setup.sql) → Run. (Safe to re-run — re-run it after updating to get the `plans` table.)
3. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Settings → API).
4. Optional: Authentication → Sign In / Providers → Email → turn off "Confirm email" if you want sign-up to log people straight in.
5. Authentication → URL Configuration: set the Site URL to your deployed site and add `https://<your-site>/reset-password` to Redirect URLs, so "Forgot password" emails land on the reset page.
6. Deploy to Vercel with the same two env vars (`vercel.json` already handles SPA routing).

## Mobile apps

```bash
cp .env.local .env.capacitor.local   # same Supabase values for native builds
npm run cap:android                  # builds, syncs, opens Android Studio
npm run cap:ios                      # builds, syncs, opens Xcode
```

Needs Android Studio (it bundles a JDK 21 — Gradle doesn't run on JDK 27) and/or Xcode.

## Publishing updates (Android)

1. Set `VITE_UPDATE_BASE_URL` (your deployed site) in `.env.capacitor.local`.
2. Build a release APK in Android Studio, sign it with `scripts/sign-apk.sh` (keys in `~/.config/ironward/release-signing.env`) → `public/downloads/ironward.apk`, and set `versionCode`/`versionName` in `ota.config.json`.
3. For web-only changes afterwards: `npm run release:web -- --notes "what changed"`, then deploy the site. Installed apps pick it up in the background.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production web build (with PWA) |
| `npm run build:native` | Build for Capacitor (no service worker) |
| `npm run cap:sync` | Build native assets and sync into `android/` and `ios/` |
| `npm run cap:android` / `cap:ios` | Sync and open the native project |
| `npm run release:web` | Build and publish an over-the-air update for installed apps |
| `scripts/sign-apk.sh` | Sign the release APK into `public/downloads/ironward.apk` |
| `npm test` | Unit tests (Vitest) for suggestions, plan order, AI/CSV parsing, plates, warm-ups |
| `npm run lint` | Oxlint |
