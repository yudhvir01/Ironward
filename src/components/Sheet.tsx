import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// The one bottom-sheet shell every picker and helper uses. Portalled to
// <body>: a parent with a transform (the cards' entrance animation) would
// otherwise trap `position: fixed` inside it.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="pb-safe animate-in flex max-h-[88vh] w-full max-w-xl flex-col rounded-t-3xl bg-card sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-display text-xl font-black">{title}</h2>
          <button className="text-sm font-semibold text-muted-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-3 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
