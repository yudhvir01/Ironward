import { Capacitor } from "@capacitor/core";

// The public site. The installed apps can't derive it (their own origin is
// https://localhost), so it is baked in at build time: they check it for
// updates and download the APK from it, call its Google token relay, and
// get Google's sign-in redirect back through it as an Android App Link.
export const UPDATE_BASE_URL: string | null = (import.meta.env.VITE_UPDATE_BASE_URL || "").replace(/\/+$/, "") || null;

// Google sign-in. The client ID is public by design: it identifies the app
// to Google. The client *secret* never reaches the browser; it lives only
// as a Vercel env var read by api/google-token.ts.
export const GOOGLE_CLIENT_ID: string | null = import.meta.env.VITE_GOOGLE_CLIENT_ID || null;

const native = Capacitor.isNativePlatform();

// The Vercel Function that swaps Google's codes for tokens: same-origin on
// the web, on the public site from inside the app.
export const GOOGLE_TOKEN_RELAY_URL = native ? `${UPDATE_BASE_URL}/api/google-token` : "/api/google-token";

// The apps need the public site for both the relay and the redirect.
export const GOOGLE_SIGNIN_ENABLED = GOOGLE_CLIENT_ID !== null && (!native || UPDATE_BASE_URL !== null);
