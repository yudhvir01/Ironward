import type { Backend } from "./backend/types";
import { deleteDevicePhoto, listDevicePhotos } from "./photos";

let running: Promise<number> | null = null;

// Photos taken while signed out (or before photos went to Drive) sit on the
// device. Once signed in with Google they move into the Ironward folder in
// Drive, one at a time: each device copy is removed only after its upload
// succeeds, so a lost connection leaves the rest for next time.
export function moveDevicePhotosToDrive(backend: Backend): Promise<number> {
  if (backend.kind !== "drive") return Promise.resolve(0);
  running ??= (async () => {
    let moved = 0;
    try {
      for (const photo of await listDevicePhotos()) {
        await backend.addPhoto(photo.day, photo.blob);
        await deleteDevicePhoto(photo.id);
        moved++;
      }
    } finally {
      running = null;
    }
    return moved;
  })();
  return running;
}
