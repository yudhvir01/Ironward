import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useBackend } from "../context/BackendProvider";
import { Capacitor } from "@capacitor/core";
import { supabase, UPDATE_BASE_URL } from "../lib/env";
import { IronwardMark } from "../components/Logo";
import { APP_MOTTO, APP_NAME, APP_TAGLINE } from "../lib/brand";

export function Login() {
  const { backend, accountsEnabled, chooseGuest, chooseAccount } = useBackend();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [showForm, setShowForm] = useState(params.has("account"));

  // Signing in flips `backend` on; send them straight in.
  useEffect(() => {
    if (backend) navigate("/", { replace: true });
  }, [backend, navigate]);
  if (backend) return <Navigate to="/" replace />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Backdrop: an ember glow over faint forward chevrons. */}
      <div className="chevrons pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_80%_0%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_70%)]" />
    <div className="pt-safe relative mx-auto flex min-h-screen max-w-sm flex-col justify-end px-6 pb-12 sm:justify-center">
      <div className="animate-in mb-10">
        <IronwardMark size={60} className="mb-6 rounded-2xl shadow-[0_12px_40px_-10px_var(--primary)]" />
        <h1 className="font-display text-6xl leading-[0.9] font-black">{APP_NAME}</h1>
        <p className="font-display mt-3 text-2xl leading-tight font-black">
          <span className="ember-text">{APP_TAGLINE}</span>
        </p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">{APP_MOTTO}</p>
        <ul className="mt-6 space-y-2 text-sm font-medium">
          {["Your plan, ready to go — tap Start", "Tells you exactly what to lift to beat last time", "Every session a step forward — and you can see it"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="font-display font-black text-primary">»</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {showForm && accountsEnabled ? (
        <AuthForm onBack={() => setShowForm(false)} onStart={chooseAccount} />
      ) : (
        <div className="space-y-3">
          {accountsEnabled && (
            <button className="btn-primary w-full py-4 text-base" onClick={() => setShowForm(true)}>
              Sign up / Log in
            </button>
          )}
          <button
            className={`${accountsEnabled ? "btn-ghost" : "btn-primary"} w-full py-4 text-base`}
            onClick={() => {
              chooseGuest();
              navigate("/", { replace: true });
            }}
          >
            {accountsEnabled ? "Just try it — no account" : "Onward »"}
          </button>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            {accountsEnabled
              ? "Without an account, logs stay on this device. You can move them into an account later."
              : "Your logs are stored on this device."}
          </p>
          <Link to="/download" className="block pt-1 text-center text-sm font-bold text-primary">
            Get the app for your phone →
          </Link>
          {!Capacitor.isNativePlatform() && (
            <Link to="/" className="block text-center text-xs font-semibold text-muted-foreground">
              ← About {APP_NAME}
            </Link>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

function AuthForm({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    if (forgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteOrigin()}/reset-password` });
      setBusy(false);
      if (error) setError(error.message);
      else setNotice("If that email has an account, a reset link is on its way. Open it on this device.");
      return;
    }
    // Mode is set first so the session that comes back is picked up as
    // the active backend.
    onStart();
    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else if (isSignUp && !data.session) setNotice("Check your email to confirm your account, then log in.");
  }

  async function google() {
    if (!supabase) return;
    setError(null);
    onStart();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: siteOrigin() } });
    if (error) setError(error.message);
  }

  if (forgot) {
    return (
      <form onSubmit={submit} className="space-y-3">
        <p className="font-display text-2xl font-black">Reset your password</p>
        <p className="text-sm text-muted-foreground">We'll email you a link to set a new one.</p>
        <input className="field" type="email" autoComplete="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-primary">{notice}</p>}
        <button className="btn-primary w-full py-4 text-base" disabled={busy}>
          {busy ? "…" : "Send reset link"}
        </button>
        <button type="button" className="w-full py-2 text-sm text-muted-foreground" onClick={() => setForgot(false)}>
          Back to log in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {GOOGLE_ENABLED && (
        <>
          <button type="button" className="btn-ghost w-full py-4 text-base" onClick={google}>
            <GoogleMark /> Continue with Google
          </button>
          <p className="text-center text-xs text-muted-foreground">or with email</p>
        </>
      )}
      <div className="flex rounded-xl bg-muted p-1 text-sm font-semibold">
        {(["Sign up", "Log in"] as const).map((label, i) => {
          const active = isSignUp === (i === 0);
          return (
            <button
              key={label}
              type="button"
              onClick={() => setIsSignUp(i === 0)}
              className={`flex-1 rounded-lg py-2 ${active ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <input className="field" type="email" autoComplete="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        className="field"
        type="password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        placeholder="Password (6+ characters)"
        minLength={6}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}
      <button className="btn-primary w-full py-4 text-base" disabled={busy}>
        {busy ? "…" : isSignUp ? "Create account" : "Log in"}
      </button>
      {!isSignUp && (
        <button type="button" className="w-full text-sm font-semibold text-primary" onClick={() => setForgot(true)}>
          Forgot password?
        </button>
      )}
      <button type="button" className="w-full py-2 text-sm text-muted-foreground" onClick={onBack}>
        Back
      </button>
    </form>
  );
}

// Google sign-in goes through Supabase and needs the provider switched on
// in the Supabase dashboard, so it's opt-in. Web only: the native apps
// would need a deep link back from the browser.
const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE === "1" && !Capacitor.isNativePlatform();

// Where emailed links should land. Inside the native app the page origin
// is https://localhost, so links point at the public site instead.
function siteOrigin(): string {
  return Capacitor.isNativePlatform() && UPDATE_BASE_URL ? UPDATE_BASE_URL : window.location.origin;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}
