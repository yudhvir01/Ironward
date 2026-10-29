import { Link } from "react-router-dom";
import { APP_NAME } from "../lib/brand";
import { Wordmark } from "./Logo";

// The public site's top bar and footer — used by the landing, download
// and privacy pages so moving between them feels like one website.
export function SiteHeader() {
  return (
    <header className="pt-safe relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
      <Link to="/" aria-label={`${APP_NAME} home`}>
        <Wordmark size={32} />
      </Link>
      <nav className="flex items-center gap-1 text-sm font-semibold">
        <a href="/#features" className="hidden rounded-full px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
          Features
        </a>
        <a href="/#download" className="hidden rounded-full px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
          Download
        </a>
        <Link to="/login" className="rounded-full bg-foreground px-4 py-2 text-background">
          Sign in
        </Link>
      </nav>
    </header>
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
