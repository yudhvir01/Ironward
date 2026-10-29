import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/env";
import { GuestBackend, requestPersistentGuestStorage } from "../lib/backend/guestBackend";
import { SupabaseBackend } from "../lib/backend/supabaseBackend";
import type { Backend } from "../lib/backend/types";

type Mode = "guest" | "account";

const MODE_KEY = "ironward.mode";

function loadMode(): Mode | null {
  const raw = localStorage.getItem(MODE_KEY);
  return raw === "guest" || (raw === "account" && supabase) ? raw : null;
}

interface BackendContextValue {
  mode: Mode | null;
  // Null until a mode is chosen and (for accounts) a session exists.
  backend: Backend | null;
  // False only during the initial Supabase getSession() round trip.
  ready: boolean;
  ownerLabel: string | null;
  session: Session | null;
  accountsEnabled: boolean;
  // Kept around after signing in, so Settings can offer to bring guest
  // workouts into the account.
  guestBackend: GuestBackend;
  chooseGuest: () => void;
  chooseAccount: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const BackendContext = createContext<BackendContextValue | undefined>(undefined);

export function BackendProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(() => loadMode());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const guestBackend = useMemo(() => new GuestBackend(), []);
  const identity = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const backend: Backend | null = useMemo(() => {
    if (mode === "guest") return guestBackend;
    if (mode === "account" && supabase && session) return new SupabaseBackend(supabase, session.user.id);
    return null;
  }, [mode, session, guestBackend]);

  // Cached rows belong to whoever produced them; switching identity on a
  // shared device must not flash the previous person's workouts.
  useEffect(() => {
    const key = backend ? (backend.kind === "guest" ? "guest" : `account:${session?.user.id}`) : null;
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
    ownerLabel: mode === "guest" ? "Guest (this device only)" : (session?.user.email ?? null),
    session,
    accountsEnabled: supabase !== null,
    guestBackend,
    chooseGuest() {
      choose("guest");
      void requestPersistentGuestStorage();
    },
    chooseAccount() {
      choose("account");
    },
    async signOut() {
      if (mode === "account" && supabase) await supabase.auth.signOut();
      queryClient.clear();
      choose(null);
    },
    async deleteAccount() {
      if (!backend) return;
      await backend.deleteAccount();
      if (mode === "account" && supabase) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
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
