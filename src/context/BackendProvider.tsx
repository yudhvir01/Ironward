import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GOOGLE_SIGNIN_ENABLED } from "../lib/env";
import { GuestBackend, requestPersistentGuestStorage } from "../lib/backend/guestBackend";
import { DriveBackend } from "../lib/backend/driveBackend";
import { restoreGoogleSignIn, SESSION_EXPIRED_EVENT, signOutOfGoogle, type GoogleDriveSession } from "../lib/backend/googleAuth";
import type { Backend } from "../lib/backend/types";

type Mode = "guest" | "account";

const MODE_KEY = "ironward.mode";

function loadMode(): Mode | null {
  const raw = localStorage.getItem(MODE_KEY);
  return raw === "guest" || (raw === "account" && GOOGLE_SIGNIN_ENABLED) ? raw : null;
}

interface BackendContextValue {
  mode: Mode | null;
  // Null until a mode is chosen and (for accounts) a session exists.
  backend: Backend | null;
  // False only while a saved Google sign-in is being restored.
  ready: boolean;
  ownerLabel: string | null;
  accountsEnabled: boolean;
  // Kept around after signing in, so Settings can offer to bring guest
  // workouts into the account.
  guestBackend: GuestBackend;
  chooseGuest: () => void;
  // Called by /auth/google/callback once the code has been exchanged.
  completeGoogleSignIn: (session: GoogleDriveSession) => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const BackendContext = createContext<BackendContextValue | undefined>(undefined);

export function BackendProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(() => loadMode());
  const [session, setSession] = useState<GoogleDriveSession | null>(null);
  const [authLoading, setAuthLoading] = useState(() => loadMode() === "account");
  const guestBackend = useMemo(() => new GuestBackend(), []);
  const identity = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "account" || session) {
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    restoreGoogleSignIn()
      .then((restored) => !cancelled && setSession(restored))
      .catch(() => undefined)
      .finally(() => !cancelled && setAuthLoading(false));
    return () => {
      cancelled = true;
    };
    // Only on first load; a later sign-in sets the session itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A refresh token that stops working (expired, or access revoked in the
  // Google account) can't be repaired here: drop the session and let the
  // route guard send the person to sign in again. Guest data and workouts
  // waiting to sync are left untouched.
  useEffect(() => {
    function expired() {
      setSession(null);
      queryClient.clear();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, [queryClient]);

  const backend: Backend | null = useMemo(() => {
    if (mode === "guest") return guestBackend;
    if (mode === "account" && session) return new DriveBackend(session);
    return null;
  }, [mode, session, guestBackend]);

  // Cached rows belong to whoever produced them; switching identity on a
  // shared device must not flash the previous person's workouts.
  useEffect(() => {
    const key = backend ? (backend.kind === "guest" ? "guest" : `account:${session?.email}`) : null;
    if (key !== identity.current) {
      if (identity.current !== null) queryClient.clear();
      identity.current = key;
    }
  }, [backend, session, queryClient]);

  function choose(next: Mode | null) {
    if (next) localStorage.setItem(MODE_KEY, next);
    else localStorage.removeItem(MODE_KEY);
    setMode(next);
  }

  const value: BackendContextValue = {
    mode,
    backend,
    ready: mode !== "account" || !authLoading,
    ownerLabel: mode === "guest" ? "Guest (this device only)" : (session?.email ?? null),
    accountsEnabled: GOOGLE_SIGNIN_ENABLED,
    guestBackend,
    chooseGuest() {
      choose("guest");
      void requestPersistentGuestStorage();
    },
    completeGoogleSignIn(next) {
      setSession(next);
      choose("account");
    },
    async signOut() {
      if (mode === "account") await signOutOfGoogle();
      setSession(null);
      queryClient.clear();
      choose(null);
    },
    async deleteAccount() {
      if (!backend) return;
      await backend.deleteAccount();
      if (mode === "account") await signOutOfGoogle();
      setSession(null);
      queryClient.clear();
      choose(null);
    },
  };

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

export function useBackend() {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error("useBackend must be used within a BackendProvider");
  return ctx;
}

export function useRequiredBackend(): Backend {
  const { backend } = useBackend();
  if (!backend) throw new Error("No backend — route guard should have redirected");
  return backend;
}
