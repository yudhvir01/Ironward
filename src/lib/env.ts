import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// A Supabase project baked in at build time (VITE_ env vars), so anyone who
// opens the site can make an account. Unset, the app is guest-only.
export const supabase: SupabaseClient | null = (() => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
})();

// Where the installed apps look for updates (`/updates/latest.json`). A
// native build's own origin is https://localhost, so it can't be derived
// at runtime; this is the public site the APK is downloaded from.
export const UPDATE_BASE_URL: string | null = (import.meta.env.VITE_UPDATE_BASE_URL || "").replace(/\/+$/, "") || null;
