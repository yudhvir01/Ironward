import type { GoogleDriveSession } from "./googleAuth";

const FOLDER_NAME = "Ironward";
const DATA_FILE_NAME = "ironward-data.json";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

// Thrown when a write's precondition check finds the file has moved on
// since it was last read — another tab or device saved in between. The
// caller (DriveBackend) surfaces this rather than silently overwriting
// whatever the other write did.
export class DriveConflictError extends Error {
  constructor() {
    super("Your Ironward data changed elsewhere since this tab last loaded it.");
  }
}

export class DriveRequestError extends Error {
  readonly status: number;

  constructor(status: number, body: string) {
    super(`Drive request failed (${status}): ${body.slice(0, 300)}`);
    this.status = status;
  }
}

async function driveFetch(session: GoogleDriveSession, url: string, init: RequestInit = {}): Promise<Response> {
  const send = async () =>
    fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await session.getAccessToken()}` } });
  let res = await send();
  // An access token can be rejected before its stated expiry (revoked,
  // clock skew). One retry with a freshly minted token covers that.
  if (res.status === 401) {
    session.forgetAccessToken();
    res = await send();
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DriveRequestError(res.status, body);
  }
  return res;
}

async function findByName(
  session: GoogleDriveSession,
  name: string,
  mimeType: string,
  parent: string | null,
): Promise<{ id: string; headRevisionId?: string } | null> {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = '${mimeType}'`,
    "trashed = false",
    parent ? `'${parent}' in parents` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  const url = `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,headRevisionId)&spaces=drive`;
  const res = await driveFetch(session, url);
  const data = (await res.json()) as { files: { id: string; headRevisionId?: string }[] };
  return data.files[0] ?? null;
}

// drive.file grants the app permanent access to anything it creates —
// not just for the session that created it — so a returning user's
// existing folder and file are found by name rather than recreated.
export async function ensureAppFolder(session: GoogleDriveSession): Promise<string> {
  const existing = await findByName(session, FOLDER_NAME, FOLDER_MIME, null);
  if (existing) return existing.id;

  const res = await driveFetch(session, `${DRIVE_API}?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  });
  const created = (await res.json()) as { id: string };
  return created.id;
}

export interface DriveDataFile {
  fileId: string;
  headRevisionId: string | undefined;
  content: string;
}

// Returns null when nothing has been saved yet (a brand-new sign-in) —
// the backend treats that as an empty dataset rather than an error.
export async function loadDataFile(session: GoogleDriveSession, folderId: string): Promise<DriveDataFile | null> {
  const existing = await findByName(session, DATA_FILE_NAME, "application/json", folderId);
  if (!existing) return null;

  const res = await driveFetch(session, `${DRIVE_API}/${existing.id}?alt=media`);
  const content = await res.text();
  return { fileId: existing.id, headRevisionId: existing.headRevisionId, content };
}

// Creates the data file the first time a signed-in Drive account writes
// anything, and returns its id + revision for subsequent saves.
export async function createDataFile(
  session: GoogleDriveSession,
  folderId: string,
  content: string,
): Promise<DriveDataFile> {
  const boundary = crypto.randomUUID();
  const metadata = { name: DATA_FILE_NAME, mimeType: "application/json", parents: [folderId] };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;

  const res = await driveFetch(
    session,
    `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,headRevisionId`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  const created = (await res.json()) as { id: string; headRevisionId?: string };
  return { fileId: created.id, headRevisionId: created.headRevisionId, content };
}

// Moves a file or folder to the Drive trash rather than deleting it
// outright, so a mistake is recoverable for the usual 30 days. Something
// already gone counts as done.
export async function trashFile(session: GoogleDriveSession, fileId: string): Promise<void> {
  try {
    await driveFetch(session, `${DRIVE_API}/${fileId}?fields=id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    });
  } catch (err) {
    if (!(err instanceof DriveRequestError && err.status === 404)) throw err;
  }
}

export async function getHeadRevision(session: GoogleDriveSession, fileId: string): Promise<string | undefined> {
  const res = await driveFetch(session, `${DRIVE_API}/${fileId}?fields=headRevisionId`);
  return ((await res.json()) as { headRevisionId?: string }).headRevisionId;
}

// Overwrites the data file's content. `expectedRevisionId` is the
// revision this write's caller last read — if the file has moved on
// since (another tab or device saved), the update is rejected with
// DriveConflictError instead of clobbering it.
export async function saveDataFile(
  session: GoogleDriveSession,
  fileId: string,
  content: string,
  expectedRevisionId: string | undefined,
): Promise<DriveDataFile> {
  if (expectedRevisionId && (await getHeadRevision(session, fileId)) !== expectedRevisionId) {
    throw new DriveConflictError();
  }

  const res = await driveFetch(
    session,
    `${DRIVE_UPLOAD_API}/${fileId}?uploadType=media&fields=headRevisionId`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: content,
    },
  );
  const updated = (await res.json()) as { headRevisionId?: string };
  return { fileId, headRevisionId: updated.headRevisionId, content };
}
