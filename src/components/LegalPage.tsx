import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./SiteChrome";

// Shared shell for the privacy and terms pages: a title, a one-line
// summary, and a stack of titled cards.
export function LegalPage({ title, intro, effective, sections }: { title: string; intro: string; effective: string; sections: [string, ReactNode][] }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="font-display text-5xl font-black">{title}</h1>
        <p className="mt-3 text-muted-foreground">{intro}</p>
        <p className="mt-1 text-xs text-muted-foreground">Effective {effective}</p>
        <div className="mt-8 space-y-4">
          {sections.map(([heading, body]) => (
            <section key={heading} className="card p-5">
              <h2 className="font-display text-xl font-black">{heading}</h2>
              <div className="mt-2 space-y-2 leading-relaxed text-muted-foreground">{body}</div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
