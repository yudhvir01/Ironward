import { useEffect, useMemo, useState } from "react";
import { addPhoto, deletePhoto, listPhotos, type Photo } from "../lib/photos";
import { fmtDay, localDay } from "../lib/stats";

// Progress photos: kept only on this phone, never uploaded. The first and
// latest sit side by side, which is the comparison that matters.
export function PhotosCard() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const reload = () => void listPhotos().then(setPhotos).catch(() => setPhotos([]));
  useEffect(reload, []);

  const urls = useMemo(() => new Map(photos.map((p) => [p.id, URL.createObjectURL(p.blob)])), [photos]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const first = photos[0];
  const latest = photos.length > 1 ? photos[photos.length - 1] : null;

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between">
        <p className="label">Progress photos</p>
        <p className="text-[10px] font-semibold text-muted-foreground">🔒 Stays on this phone</p>
      </div>
      {first && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[first, latest].map((p, i) =>
            p ? (
              <figure key={p.id} className="relative">
                <img src={urls.get(p.id)} alt={`Progress photo ${fmtDay(p.day)}`} className="aspect-[3/4] w-full rounded-2xl object-cover" />
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
      {photos.length > 2 && (
        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          {photos.map((p) => (
            <button
              key={p.id}
              className="relative shrink-0"
              onClick={() => confirm(`Delete the photo from ${fmtDay(p.day)}?`) && void deletePhoto(p.id).then(reload)}
              aria-label={`Delete photo from ${fmtDay(p.day)}`}
            >
              <img src={urls.get(p.id)} alt="" className="h-16 w-12 rounded-lg object-cover" />
            </button>
          ))}
        </div>
      )}
      <label className="btn-ghost mt-3 w-full cursor-pointer">
        {busy ? "Saving…" : "+ Add photo"}
        <input
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            await addPhoto(f, localDay()).catch(() => undefined);
            setBusy(false);
            reload();
          }}
        />
      </label>
      {photos.length === 2 && (
        <button className="mt-2 w-full text-xs text-muted-foreground" onClick={() => latest && confirm("Delete the latest photo?") && void deletePhoto(latest.id).then(reload)}>
          Delete latest
        </button>
      )}
    </section>
  );
}
