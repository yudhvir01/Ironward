import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  // "danger" for anything that deletes or throws work away.
  tone?: "danger" | "default";
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

// The app's own "are you sure?" — replaces the browser's confirm(), which
// can't be styled and looks out of place (and, inside the phone app, like
// a system error). Usage: `if (!(await confirm({ title: "…" }))) return;`
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used within a ConfirmProvider");
  return confirm;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  // Kept mounted briefly after closing so it can animate out.
  const [open, setOpen] = useState(false);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
        requestAnimationFrame(() => setOpen(true));
      }),
    [],
  );

  const close = useCallback(
    (ok: boolean) => {
      if (!pending) return;
      pending.resolve(ok);
      setOpen(false);
      window.setTimeout(() => setPending((p) => (p === pending ? null : p)), 220);
    },
    [pending],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <Dialog {...pending} open={open} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function Dialog({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "default", open, onClose }: ConfirmOptions & { open: boolean; onClose: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Cancel gets focus: Enter on a keyboard should never delete by accident.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  const danger = tone === "danger";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <button
        aria-label={cancelLabel}
        tabIndex={-1}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => onClose(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? "confirm-message" : undefined}
        className={`card relative w-full max-w-md rounded-b-none p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl transition duration-200 ease-out motion-reduce:transition-none sm:rounded-3xl sm:pb-6 ${
          open ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-6 opacity-0 sm:translate-y-2 sm:scale-95"
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black ${
            danger ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"
          }`}
          aria-hidden="true"
        >
          {danger ? "!" : "?"}
        </span>
        <h2 id="confirm-title" className="font-display mt-4 text-2xl leading-tight font-black">
          {title}
        </h2>
        {message && (
          <p id="confirm-message" className="mt-2 leading-relaxed text-muted-foreground">
            {message}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} className="btn-ghost sm:min-w-28" onClick={() => onClose(false)}>
            {cancelLabel}
          </button>
          <button
            className={`btn sm:min-w-28 ${danger ? "bg-destructive text-white shadow-[0_8px_24px_-8px_var(--destructive)]" : "bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)]"}`}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
