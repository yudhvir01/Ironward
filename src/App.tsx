import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { OutboxSync } from "./components/OutboxSync";
import { BackendProvider, useBackend } from "./context/BackendProvider";
import { ThemeProvider } from "./context/ThemeProvider";
import { AppShell } from "./components/AppShell";
import { AppUpdater } from "./components/AppUpdater";
import { Login } from "./pages/Login";
import { Today } from "./pages/Today";
import { WorkoutPage } from "./pages/Workout";

// Everything off the gym-floor path loads on demand.
const History = lazy(() => import("./pages/History").then((m) => ({ default: m.History })));
const WorkoutDetail = lazy(() => import("./pages/WorkoutDetail").then((m) => ({ default: m.WorkoutDetail })));
const Progress = lazy(() => import("./pages/Progress").then((m) => ({ default: m.Progress })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const Guide = lazy(() => import("./pages/Guide").then((m) => ({ default: m.Guide })));
const Plans = lazy(() => import("./pages/Plans").then((m) => ({ default: m.Plans })));
const PlanEditor = lazy(() => import("./pages/PlanEditor").then((m) => ({ default: m.PlanEditor })));
const AiPlan = lazy(() => import("./pages/AiPlan").then((m) => ({ default: m.AiPlan })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const Welcome = lazy(() => import("./pages/Welcome").then((m) => ({ default: m.Welcome })));
const Import = lazy(() => import("./pages/Import").then((m) => ({ default: m.Import })));
const Landing = lazy(() => import("./pages/Landing").then((m) => ({ default: m.Landing })));
const Privacy = lazy(() => import("./pages/Privacy").then((m) => ({ default: m.Privacy })));
const Download = lazy(() => import("./pages/Download").then((m) => ({ default: m.Download })));

const WEEK = 7 * 24 * 60 * 60 * 1000;

// Cached data is kept on the device so History and Progress open with no
// signal; it's refreshed from the server whenever there is one.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: WEEK, refetchOnWindowFocus: false } },
});

const persister = createSyncStoragePersister({ storage: typeof window === "undefined" ? undefined : window.localStorage, key: "ironward.cache" });

function RequireBackend() {
  const { backend, ready, mode } = useBackend();
  const { pathname } = useLocation();
  if (!ready) return <Splash />;
  if (!backend) {
    // Signed-out visitors to the website's front page get the landing
    // page; the phone app goes straight to sign-in, like Waypoint.
    if (pathname === "/" && mode !== "account" && !Capacitor.isNativePlatform()) return <Landing />;
    return <Navigate to={mode === "account" ? "/login?account=1" : "/login"} replace />;
  }
  return <Outlet />;
}

function Splash() {
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: WEEK }}
      // The saved copy is for showing something instantly (and offline);
      // it may be seconds out of date, so refresh everything right after.
      onSuccess={() => void queryClient.invalidateQueries()}
    >
      <ThemeProvider>
        <BackendProvider>
          <BrowserRouter>
            <AppUpdater />
            <OutboxSync />
            <Suspense fallback={<Splash />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/download" element={<Download />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<RequireBackend />}>
                  <Route path="/workout" element={<WorkoutPage />} />
                  <Route path="/welcome" element={<Welcome />} />
                  <Route element={<AppShell />}>
                    <Route path="/" element={<Today />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/history/:id" element={<WorkoutDetail />} />
                    <Route path="/progress" element={<Progress />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/guide" element={<Guide />} />
                    <Route path="/plans" element={<Plans />} />
                    <Route path="/import" element={<Import />} />
                    <Route path="/plans/ai" element={<AiPlan />} />
                    <Route path="/plans/:id" element={<PlanEditor />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </BackendProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
