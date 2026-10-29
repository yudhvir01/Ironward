import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "./ConfirmDialog";
import { useRequiredBackend } from "../context/BackendProvider";
import { useAddPhoto, useDeletePhoto, usePhotos } from "../hooks/useData";
import { moveDevicePhotosToDrive } from "../lib/photoSync";
import { shrinkPhoto } from "../lib/photos";
import { fmtDay, localDay } from "../lib/stats";
import type { PhotoMeta } from "../lib/backend/types";

// Progress photos. Signed in with Google they're saved in the Ironward
// folder in Drive, and deleting one here moves it to the Drive trash; a
// guest's stay on the phone. The first and latest sit side by side, which
// is the comparison that matters.
export function PhotosCard() {
  const backend = useRequiredBackend();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { data: photos = [], isLoading } = usePhotos();
  const add = useAddPhoto();
  const remove = useDeletePhoto();
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const drive = backend.kind === "drive";

  // Anything still only on this phone goes up to Drive.
  useEffect(() => {
    if (!drive) return;
    moveDevicePhotosToDrive(backend)
      .then((n) => {
        if (n) void qc.invalidateQueries({ queryKey: ["photos"] });
      })
      .catch(() => setNote("Some photos on this phone couldn't be moved to Drive yet. They'll try again next time."));
  }, [backend, drive, qc]);

  const first = photos[0];
  const latest = photos.length > 1 ? photos[photos.length - 1] : null;

  async function del(p: PhotoMeta) {
    const ok = await confirm({
      title: "Delete this photo?",
      message: drive
        ? `The photo from ${fmtDay(p.day)} moves to your Google Drive trash, where you can still restore it for 30 days.`
        : `The photo from ${fmtDay(p.day)} will be removed from this phone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setLeaving((s) => new Set(s).add(p.id));
    window.setTimeout(() => remove.mutate(p.id, { onError: () => setNote("Couldn't delete that photo. Try again.") }), 220);
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setNote(null);
    try {
      await add.mutateAsync({ day: localDay(), image: await shrinkPhoto(file) });
    } catch {
      setNote(drive ? "Couldn't save the photo to Drive. Check your connection and try again." : "Couldn't save the photo.");
    }
  }

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between">
        <p className="label">Progress photos</p>
        <p className="text-[10px] font-semibold text-muted-foreground">{drive ? "☁️ Saved in your Google Drive" : "🔒 Stays on this phone"}</p>
      </div>
      {isLoading && <div className="mt-3 aspect-[3/2] animate-pulse rounded-2xl bg-muted" />}
      {first && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[first, latest].map((p, i) =>
            p ? (
              <figure key={p.id} className="animate-in relative">
                <PhotoImage id={p.id} alt={`Progress photo ${fmtDay(p.day)}`} className="aspect-[3/4] w-full rounded-2xl" />
                <figcaption className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                  {i === 0 ? "First" : "Latest"} · {fmtDay(p.day, { day: "numeric", month: "short" })}
                </figcaption>
              </figure>
            ) : (
              <div key="empty" className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Add another in a few weeks to compare
              </div>
            ),
          )}
        </div>
      )}
      {photos.length > 0 && (
        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pt-1 [scrollbar-width:none]">
          {photos.map((p) => (
            <div
              key={p.id}
              className={`animate-in relative shrink-0 transition-all duration-200 ease-out ${leaving.has(p.id) ? "w-0 scale-75 opacity-0" : "w-12"}`}
            >
              <PhotoImage id={p.id} alt="" className="h-16 w-12 rounded-lg" />
              <button
                onClick={() => void del(p)}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white transition active:scale-90"
                aria-label={`Delete photo from ${fmtDay(p.day)}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <label className={`btn-ghost mt-3 w-full cursor-pointer ${add.isPending ? "pointer-events-none opacity-70" : ""}`}>
        {add.isPending ? (drive ? "Uploading to Drive…" : "Saving…") : "+ Add photo"}
        <input
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void pick(f);
          }}
        />
      </label>
      {note && <p className="animate-in mt-2 text-xs text-destructive">{note}</p>}
    </section>
  );
}

// Loads a photo's image (from the device, or from Drive via the device's
// cache) and fades it in.
function PhotoImage({ id, alt, className }: { id: string; alt: string; className: string }) {
  const backend = useRequiredBackend();
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const made = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    backend
      .photoBlob(id)
      .then((blob) => {
        if (!active) return;
        made.current = URL.createObjectURL(blob);
        setUrl(made.current);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (made.current) URL.revokeObjectURL(made.current);
    };
  }, [backend, id]);

  return (
    <div className={`overflow-hidden bg-muted ${className} ${loaded ? "" : "animate-pulse"}`}>
      {url && <img src={url} alt={alt} onLoad={() => setLoaded(true)} className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`} />}
    </div>
  );
}
