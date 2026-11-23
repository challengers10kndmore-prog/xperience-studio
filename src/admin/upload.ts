/**
 * Uploads to the private Supabase inbox.
 * Supabase Free rejects any single object over 50 MB, so files over 45 MB are split with File.slice into
 * 45 MB parts (<path>.part001, .part002, …), no re-encoding, no quality loss. The sync Action joins them back.
 * Each part retries up to 3 times; progress is reported across all parts.
 */
import { getSupabase } from "@/lib/supabase";
import { formatBytes } from "@/lib/utils";
import { contentTypeFor } from "./compressVideo";
import { inboxUsage, INBOX_LIMIT_BYTES } from "./db";

export const PART_BYTES = 45 * 1024 * 1024;
export const SUPABASE_OBJECT_LIMIT = 50 * 1024 * 1024;
export type InboxEntry = string | { parts: string[]; size: number; name: string; type: string };

export class UploadError extends Error {}

function friendly(status: number, body: string) {
  if (status === 413 || /maximum allowed size|too large|Payload too large/i.test(body)) {
    return "Supabase rejected a piece as too large (its free plan allows 50 MB per file). Try again; if it repeats, tell Claude.";
  }
  if (status === 401 || status === 403) return "You were signed out or aren't allowed to upload. Sign in again.";
  if (/quota|storage limit|exceed/i.test(body)) return "The upload inbox is full (1 GB). Wait for pending videos to publish, then try again.";
  return `Upload failed (HTTP ${status}). ${body.slice(0, 160)}`;
}

function putPart(url: string, token: string, blob: Blob, type: string, onBytes: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onBytes(e.loaded);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(Object.assign(new UploadError(friendly(xhr.status, xhr.responseText)), { status: xhr.status })));
    xhr.onerror = () => reject(new UploadError("Network error while uploading."));
    xhr.send(blob);
  });
}

const objectUrl = (p: string) => `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/inbox/${p.split("/").map(encodeURIComponent).join("/")}`;

/** Throws a clear message if the 1 GB inbox can't take `bytes` more. */
export async function ensureInboxRoom(bytes: number) {
  let used: number;
  try { used = (await inboxUsage()).bytes; } catch { return; } // can't check: let the upload try
  if (used + bytes > INBOX_LIMIT_BYTES) {
    throw new UploadError(`The upload inbox doesn't have room: ${formatBytes(used)} of 1 GB used, this needs ${formatBytes(bytes)}. Click "Publish all pending" and wait for videos to go Live (they leave the inbox), then try again.`);
  }
}

export async function uploadToInbox(basePath: string, file: File, onProgress?: (ratio: number, note?: string) => void): Promise<InboxEntry> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new UploadError("Signed out. Sign in again.");
  const type = contentTypeFor(file);
  const pieces: { path: string; blob: Blob }[] = [];
  if (file.size <= PART_BYTES) pieces.push({ path: basePath, blob: file });
  else for (let i = 0, n = 1; i < file.size; i += PART_BYTES, n++) pieces.push({ path: `${basePath}.part${String(n).padStart(3, "0")}`, blob: file.slice(i, i + PART_BYTES) });

  const done = new Array(pieces.length).fill(0);
  const report = (k: number) => onProgress?.(done.reduce((a, b) => a + b, 0) / file.size, pieces.length > 1 ? `part ${k + 1} of ${pieces.length}` : undefined);
  for (let k = 0; k < pieces.length; k++) {
    const { path, blob } = pieces[k];
    for (let attempt = 1; ; attempt++) {
      try {
        await putPart(objectUrl(path), token, blob, pieces.length > 1 ? "application/octet-stream" : type, (b) => { done[k] = b; report(k); });
        done[k] = blob.size; report(k);
        break;
      } catch (e) {
        const status = (e as { status?: number }).status ?? 0;
        if (attempt >= 3 || status === 401 || status === 403) throw e;
        onProgress?.(done.reduce((a, b) => a + b, 0) / file.size, `retrying part ${k + 1} (attempt ${attempt + 1} of 3)`);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        done[k] = 0;
      }
    }
  }
  return pieces.length === 1 ? basePath : { parts: pieces.map((p) => p.path), size: file.size, name: file.name, type };
}
