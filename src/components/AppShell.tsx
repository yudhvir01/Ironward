import { NavLink, Outlet } from "react-router-dom";
import { ChartIcon, DumbbellIcon, GearIcon, HistoryIcon } from "./Icons";

const tabs = [
  { to: "/", label: "Train", Icon: DumbbellIcon, end: true },
  { to: "/history", label: "History", Icon: HistoryIcon },
  { to: "/progress", label: "Progress", Icon: ChartIcon },
  { to: "/settings", label: "Settings", Icon: GearIcon },
];

// Bottom tabs on every screen size: one-handed on a phone, and the content
// column is narrow enough on desktop that a sidebar would only add travel.
export function AppShell() {
  return (
    <div className="min-h-screen pb-28">
      <main className="pt-safe mx-auto max-w-xl px-4">
        <Outlet />
      </main>
      <nav className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto mx-auto mb-3 flex max-w-sm gap-1 rounded-full border border-border bg-card/80 p-1.5 shadow-2xl shadow-black/20 backdrop-blur-xl max-sm:mx-4">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold transition ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} />
                  {isActive && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="animate-in flex items-end justify-between gap-3 pt-7 pb-5">
      <div>
        <h1 className="font-display text-3xl font-black">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
