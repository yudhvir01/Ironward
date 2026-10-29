import { openDB, type DBSchema } from "idb";

// The device's photo store. A guest's progress photos live only here; for
// a Google account it doubles as a cache of photos already in Drive, so
// they show instantly and work offline.
export interface Photo {
  id: string;
  day: string;
  blob: Blob;
}

interface PhotoDB extends DBSchema {
  photos: { key: string; value: Photo };
  // Copies of Drive photos, keyed by the photo id.
  cache: { key: string; value: Blob };
}

const db = () =>
  openDB<PhotoDB>("ironward-photos", 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) d.createObjectStore("photos", { keyPath: "id" });
      if (oldVersion < 2) d.createObjectStore("cache");
    },
  });

export async function listDevicePhotos(): Promise<Photo[]> {
  return (await (await db()).getAll("photos")).sort((a, b) => a.day.localeCompare(b.day));
}

export async function putDevicePhoto(photo: Photo): Promise<void> {
  await (await db()).put("photos", photo);
}

export async function getDevicePhoto(id: string): Promise<Photo | undefined> {
  return (await db()).get("photos", id);
}

export async function deleteDevicePhoto(id: string): Promise<void> {
  await (await db()).delete("photos", id);
}

export async function getCachedPhoto(id: string): Promise<Blob | undefined> {
  return (await db()).get("cache", id);
}

export async function cachePhoto(id: string, blob: Blob): Promise<void> {
  await (await db()).put("cache", blob, id);
}

export async function uncachePhoto(id: string): Promise<void> {
  await (await db()).delete("cache", id);
}

// Phone photos are huge; shrink to 1080px on the long side as JPEG.
export async function shrinkPhoto(file: Blob): Promise<Blob> {
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
