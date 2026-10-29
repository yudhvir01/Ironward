import { openDB, type DBSchema } from "idb";

// Progress photos stay on this device only — never uploaded, not in
// backups. Private by design.
export interface Photo {
  id: string;
  day: string;
  blob: Blob;
}

interface PhotoDB extends DBSchema {
  photos: { key: string; value: Photo };
}

const db = () =>
  openDB<PhotoDB>("ironward-photos", 1, {
    upgrade(d) {
      d.createObjectStore("photos", { keyPath: "id" });
    },
  });

export async function listPhotos(): Promise<Photo[]> {
  return (await (await db()).getAll("photos")).sort((a, b) => a.day.localeCompare(b.day));
}

// Phone photos are huge; shrink to 1080px on the long side as JPEG.
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1080 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.8));
  } catch {
    return file;
  }
}

export async function addPhoto(file: File, day: string): Promise<void> {
  await (await db()).put("photos", { id: crypto.randomUUID(), day, blob: await shrink(file) });
}

export async function deletePhoto(id: string): Promise<void> {
  await (await db()).delete("photos", id);
}
