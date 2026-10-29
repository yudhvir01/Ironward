import { Link } from "react-router-dom";
import { InstallOptions } from "../components/InstallOptions";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { APP_NAME, APP_TAGLINE } from "../lib/brand";

// /download: the landing page's "Get the app" section on its own, for
// sharing as a link.
export function Download() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_80%_0%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_70%)]" />
      <SiteHeader />
      <main className="relative mx-auto max-w-4xl px-5 py-8">
        <h1 className="font-display text-5xl leading-[0.9] font-black sm:text-6xl">Get {APP_NAME}</h1>
        <p className="font-display mt-2 mb-8 text-xl font-bold text-muted-foreground">{APP_TAGLINE}</p>
        <InstallOptions />
        <Link to="/login" className="btn-ghost mt-6 w-full py-4">
          Or just use it in the browser →
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
