import { APP_NAME } from "../lib/brand";

// The mark: an iron plate whose bar drives forward into an arrow —
// onward with iron. Draws in the current ember/ink colours so it follows
// light and dark mode.
export function IronwardMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--primary)" />
      <circle cx="19" cy="32" r="14" fill="var(--primary-foreground)" />
      <circle cx="19" cy="32" r="8.5" fill="none" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="19" cy="32" r="3" fill="var(--primary)" />
      <rect x="34" y="22" width="5" height="20" rx="2" fill="var(--primary-foreground)" />
      <rect x="38" y="29" width="8" height="6" rx="1" fill="var(--primary-foreground)" />
      <path d="M44 19.5 57 32 44 44.5Z" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Wordmark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <IronwardMark size={size} />
      <span className="font-display font-black tracking-tight" style={{ fontSize: size * 0.62 }}>
        {APP_NAME.toUpperCase()}
      </span>
    </span>
  );
}
