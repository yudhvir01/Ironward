import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { GOOGLE_CLIENT_ID, GOOGLE_TOKEN_RELAY_URL, UPDATE_BASE_URL } from "../env";
import { clearDriveSession, loadDriveSession, saveDriveSession } from "./driveAuthStore";

// drive.file: the app can only see/create files it makes itself (or that
// a person explicitly opens with it) — never the rest of someone's
// Drive. email/profile/openid are just for showing who's signed in.
const SCOPES = "https://www.googleapis.com/auth/drive.file email profile openid";

const STATE_KEY = "ironward.googleOAuthState";

// localStorage, not sessionStorage: an installed (home-screen) web app can
// hand the Google round trip to a browser tab, and the state must still be
// readable when the redirect lands there.
function oauthStorage(): Storage {
  return localStorage;
}

// The apps use the public site's callback too: Android hands that URL back
// to the app as a verified App Link (see AndroidManifest.xml and
// public/.well-known/assetlinks.json), so one redirect URI serves both.
export function googleRedirectUri(): string {
  const origin = Capacitor.isNativePlatform() ? UPDATE_BASE_URL : window.location.origin;
  return `${origin}/auth/google/callback`;
}

// access_type=offline + prompt=consent are what make Google hand back a
// refresh_token at all — without both, a returning user only gets a
// short-lived access_token and would need a Google popup again every
// hour. Consent is asked every time on purpose: it's the only way this
// (stateless) relay can be sure a refresh_token comes
// back, since Google otherwise only issues one on a user's *first-ever*
// consent for this app.
export function buildGoogleAuthUrl(): string {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google sign-in is not configured.");
  const state = crypto.randomUUID();
  oauthStorage().setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function startGoogleSignIn(): Promise<void> {
  const url = buildGoogleAuthUrl();
  // Google refuses sign-in inside an app's web view, so the apps use the
  // system browser (a Custom Tab on Android).
  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.location.assign(url);
}

// One-time use: cleared as soon as it's checked, whether or not it
// matched, so a replayed callback URL can't be verified twice.
export function consumeGoogleOAuthState(receivedState: string | null): boolean {
  const expected = oauthStorage().getItem(STATE_KEY);
  oauthStorage().removeItem(STATE_KEY);
  return !!expected && !!receivedState && expected === receivedState;
}

interface RelayTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

class RelayError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

interface RelayErrorResponse {
  error: string;
  error_description?: string;
  message?: string;
}

// The saved sign-in no longer works (refresh token expired or access was
// revoked). Signing in again is the only fix, so the app listens for this
// and sends the person back to the login screen.
export const SESSION_EXPIRED_EVENT = "ironward-google-session-expired";

export class SessionExpiredError extends Error {
  constructor() {
    super("Your Google sign-in has expired. Please sign in again.");
  }
}

async function callRelay(body: object): Promise<RelayTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_RELAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({ error: "relay_unavailable", message: "Google sign-in is unavailable right now. Try again shortly." }))) as
    | RelayTokenResponse
    | RelayErrorResponse;
  if (!res.ok) {
    const err = data as RelayErrorResponse;
    throw new RelayError(err.error, err.error_description || err.message || err.error || "Google sign-in failed.");
  }
  return data as RelayTokenResponse;
}

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Couldn't read your Google account's email.");
  const info = (await res.json()) as { email?: string };
  return info.email ?? "Google account";
}

// Completes the flow after Google redirects back to /auth/google/callback
// with a `code`. Exchanges it via the relay, stores the resulting
// refresh_token, and returns an active session ready to use.
export async function completeGoogleSignIn(code: string): Promise<GoogleDriveSession> {
  const tokens = await callRelay({
    grant_type: "authorization_code",
    code,
    redirect_uri: googleRedirectUri(),
  });
  if (!tokens.refresh_token) {
    // Happens if Google decided not to re-issue one (e.g. consent was
    // skipped some other way) — without it there's nothing to persist
    // past this access_token's ~hour, so treat it as a hard failure
    // rather than a session that silently stops working later.
    throw new Error("Google didn't grant offline access — try signing in again.");
  }
  const email = await fetchGoogleEmail(tokens.access_token);
  await saveDriveSession(email, tokens.refresh_token);
  return new GoogleDriveSession(email, tokens.refresh_token, tokens.access_token, tokens.expires_in);
}

// Rebuilds a session from whatever's already saved — used on every app
// load so a Drive sign-in survives a reload.
export async function restoreGoogleSignIn(): Promise<GoogleDriveSession | null> {
  const saved = await loadDriveSession();
  if (!saved) return null;
  return new GoogleDriveSession(saved.email, saved.refreshToken, null, 0);
}

export async function signOutOfGoogle(): Promise<void> {
  await clearDriveSession();
}

// Holds the short-lived access_token in memory and refreshes it through
// the relay on demand — the refresh_token is the only part that's ever
// persisted. Safety margin on the expiry check so a token doesn't expire
// mid-request on a slow connection.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

export class GoogleDriveSession {
  readonly email: string;
  private readonly refreshToken: string;
  private accessToken: string | null;
  private accessTokenExpiresAt: number;

  constructor(email: string, refreshToken: string, accessToken: string | null, expiresInSeconds: number) {
    this.email = email;
    this.refreshToken = refreshToken;
    this.accessToken = accessToken;
    this.accessTokenExpiresAt = accessToken ? Date.now() + expiresInSeconds * 1000 : 0;
  }

  forgetAccessToken(): void {
    this.accessToken = null;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - EXPIRY_SAFETY_MARGIN_MS) {
      return this.accessToken;
    }
    let tokens: RelayTokenResponse;
    try {
      tokens = await callRelay({ grant_type: "refresh_token", refresh_token: this.refreshToken });
    } catch (e) {
      if (e instanceof RelayError && e.code === "invalid_grant") {
        await clearDriveSession().catch(() => undefined);
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        throw new SessionExpiredError();
      }
      throw e;
    }
    this.accessToken = tokens.access_token;
    this.accessTokenExpiresAt = Date.now() + tokens.expires_in * 1000;
    return this.accessToken;
  }

  // Withdraws Ironward's access to this Google account. Best effort: the
  // account is being left either way, and the person can also remove the
  // app from their Google account's security page.
  async revoke(): Promise<void> {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: this.refreshToken }),
      });
    } catch {
      // Nothing more to do.
    }
  }
}
