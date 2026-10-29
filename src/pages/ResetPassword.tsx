import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useBackend } from "../context/BackendProvider";
import { supabase } from "../lib/env";

// Where the emailed reset link lands. Supabase signs the person in from
// the link itself; this page just sets the new password.
export function ResetPassword() {
  const navigate = useNavigate();
  const { chooseAccount } = useBackend();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    chooseAccount();
    navigate("/", { replace: true });
  }

  return (
    <div className="pt-safe mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="font-display text-4xl font-black">New password</h1>
      {!supabase ? (
        <p className="mt-3 text-muted-foreground">Accounts aren't set up on this site.</p>
      ) : !ready ? (
        <p className="mt-3 text-muted-foreground">Checking your reset link… If nothing happens, request a new link from the log-in screen.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            placeholder="New password (6+ characters)"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button className="btn-primary w-full py-4 text-base" disabled={busy}>
            {busy ? "…" : "Save and log in"}
          </button>
        </form>
      )}
    </div>
  );
}
