import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { IronwardMark } from "../components/Logo";
import { useBackend } from "../context/BackendProvider";
import { DriveBackend } from "../lib/backend/driveBackend";
import { completeGoogleSignIn, consumeGoogleOAuthState } from "../lib/backend/googleAuth";
import { moveDevicePhotosToDrive } from "../lib/photoSync";
import { listDevicePhotos } from "../lib/photos";

// Where Google sends the browser back to after the consent screen. The
// path must match an Authorized redirect URI in the Google Cloud console
// exactly. It trades the one-time `code` for a session, then moves anything
// logged as a guest on this device into the account, so signing in never
// strands workouts on the device.
export function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeGoogleSignIn: adoptSession, guestBackend } = useBackend();
  const [status, setStatus] = useState("Signing you in…");
  const [error, setError] = useState<string | null>(null);
  // The code can be redeemed once; StrictMode's second effect run must not
  // try again.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const oauthError = params.get("error");
    if (oauthError) {
      setError(oauthError === "access_denied" ? "Sign-in was cancelled." : `Google returned an error: ${oauthError}`);
      return;
    }
    const code = params.get("code");
    if (!code || !consumeGoogleOAuthState(params.get("state"))) {
      setError("Couldn't verify this sign-in request — please try again.");
      return;
    }

    void (async () => {
      let session;
      try {
        session = await completeGoogleSignIn(code);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Google sign-in failed.");
        return;
      }
      try {
        const guest = await guestBackend.exportAll();
        if (guest.workouts.length || guest.bodyweights.length || guest.plans.length || guest.logs.length) {
          setStatus("Moving your workouts to Google Drive…");
          await new DriveBackend(session).importAll(guest);
          // Only once Drive has it: the device copy is no longer needed,
          // and keeping it would make it look like separate data.
          await guestBackend.deleteAccount();
        }
        // Photos are bigger; if they can't all go now, the Progress tab
        // carries on with the rest later.
        if ((await listDevicePhotos().catch(() => [])).length) {
          setStatus("Moving your progress photos to Google Drive…");
          await moveDevicePhotosToDrive(new DriveBackend(session)).catch(() => undefined);
        }
      } catch {
        // Signed in either way. The guest data is still on the device, and
        // the next sign-in (or Settings) tries the move again.
        adoptSession(session);
        navigate("/settings", { replace: true, state: { migrationFailed: true } });
        return;
      }
      adoptSession(session);
      navigate("/", { replace: true });
    })();
    // Runs once against the URL as it arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <IronwardMark size={40} className="mb-8 rounded-xl" />
      {error ? (
        <>
          <h1 className="font-display text-2xl font-black">Couldn't sign you in</h1>
          <p className="mt-2 text-sm text-destructive">{error}</p>
          <Link to="/login" className="mt-6 text-sm font-semibold text-primary">
            ← Back to sign in
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
    </div>
  );
}
