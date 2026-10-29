import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { APP_NAME } from "../lib/brand";
import { Wordmark } from "./Logo";

// The public site's top bar and footer — used by the landing, download
// and legal pages so moving between them feels like one website.
//
// The bar floats with room above it and stays pinned while scrolling; once
// the page moves it gains a frosted backdrop and tightens up.
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const link =
    "group relative hidden rounded-full px-3 py-2 text-muted-foreground transition-colors duration-300 hover:text-foreground sm:block";
  const underline =
    "pointer-events-none absolute inset-x-3 bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 group-hover:scale-x-100";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-5" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border px-3 transition-all duration-500 ease-out sm:px-4 ${
            scrolled
              ? "border-border/80 bg-background/85 py-2 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              : "border-transparent bg-transparent py-3"
          }`}
        >
          <Link to="/" aria-label={`${APP_NAME} home`} className="transition-transform duration-300 hover:scale-[1.03]">
            <Wordmark size={32} className={`origin-left transition-transform duration-500 ease-out ${scrolled ? "scale-90" : ""}`} />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <a href="/#features" className={link}>
              Features
              <span className={underline} />
            </a>
            <a href="/#how" className={link}>
              How it works
              <span className={underline} />
            </a>
            <a href="/#download" className={link}>
              Download
              <span className={underline} />
            </a>
            <Link
              to="/login"
              className="ml-1 rounded-full bg-foreground px-4 py-2 text-background transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_var(--primary)]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      {/* Keeps the page's content clear of the fixed bar. */}
      <div aria-hidden="true" style={{ height: "calc(max(1rem, env(safe-area-inset-top)) + 4.5rem)" }} />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="px-6 py-10 text-center text-xs text-muted-foreground">
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        <a href="/#features" className="hover:underline">Features</a>
        <Link to="/download" className="hover:underline">Download</Link>
        <Link to="/privacy" className="hover:underline">Privacy</Link>
        <Link to="/terms" className="hover:underline">Terms</Link>
        <Link to="/login" className="hover:underline">Sign in</Link>
      </div>
      <p className="mt-3">
        © {new Date().getFullYear()} {APP_NAME} · Always moving forward. · Exercise photos from Free Exercise DB (public domain)
      </p>
    </footer>
  );
}
