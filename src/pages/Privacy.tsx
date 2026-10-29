import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { APP_NAME } from "../lib/brand";

// Plain-language privacy page — what's stored, where, and how to delete it.
export function Privacy() {
  const sections: [string, string][] = [
    [
      "What we store",
      `Your workouts, plans, body weight, measurements and protein logs. With an account, these are kept in our database with your email so you can sign in on any device. Without an account, everything stays in your browser or phone and never reaches us.`,
    ],
    ["Progress photos", "Never uploaded. They stay on the device you took them on and aren't included in backups."],
    ["What we don't do", "No ads, no selling or sharing your data, no third-party trackers in the app."],
    [
      "The AI coach",
      `${APP_NAME} doesn't send your data to any AI. When you use the AI coach, you copy a prompt yourself and paste it into the assistant you choose — what you share there is between you and that service.`,
    ],
    ["Your control", "Export everything (CSV or a backup file) and delete your account and all its data any time from Settings."],
  ];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="font-display text-5xl font-black">Privacy</h1>
        <p className="mt-3 text-muted-foreground">Short version: your training data is yours.</p>
        <div className="mt-8 space-y-4">
          {sections.map(([title, body]) => (
            <section key={title} className="card p-5">
              <h2 className="font-display text-xl font-black">{title}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
