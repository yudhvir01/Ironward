import { Capacitor } from "@capacitor/core";

// Google sign-in. The client ID is public by design: it identifies the app
// to Google. The client *secret* never reaches the browser; it lives only
// as a Vercel env var read by api/google-token.ts.
export const GOOGLE_CLIENT_ID: string | null = import.meta.env.VITE_GOOGLE_CLIENT_ID || null;

// Same-origin Vercel Function that swaps Google's codes for tokens.
export const GOOGLE_TOKEN_RELAY_URL = "/api/google-token";

// Web only: the native apps would need a deep link back from the browser.
export const GOOGLE_SIGNIN_ENABLED = GOOGLE_CLIENT_ID !== null && !Capacitor.isNativePlatform();

// Where the installed apps look for updates (`/updates/latest.json`). A
// native build's own origin is https://localhost, so it can't be derived
// at runtime; this is the public site the APK is downloaded from.
export const UPDATE_BASE_URL: string | null = (import.meta.env.VITE_UPDATE_BASE_URL || "").replace(/\/+$/, "") || null;
