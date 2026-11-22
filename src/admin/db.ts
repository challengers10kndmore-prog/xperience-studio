import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { contentTypeFor } from "./compressVideo";

/** Untyped client for the generic admin screens (column names come from resource configs). */
export const db = () => getSupabase() as unknown as SupabaseClient;

export type AnyRow = Record<string, unknown>;

export async function uploadToInbox(path: string, file: File, onProgress?: (r: number) => void) {
  // supabase-js has no upload progress; use XHR against the storage endpoint so big files show progress.
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Signed out. Sign in again.");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/inbox/${path.split("/").map(encodeURIComponent).join("/")}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", contentTypeFor(file));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (HTTP ${xhr.status}): ${xhr.responseText.slice(0, 200)}`)));
    xhr.onerror = () => reject(new Error("Upload failed (network)."));
    xhr.send(file);
  });
  return path;
}

export const INBOX_LIMIT_BYTES = 1024 * 1024 * 1024;

export async function inboxUsage() {
  const { data, error } = await getSupabase().rpc("inbox_usage");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { bytes: Number(row?.bytes ?? 0), files: Number(row?.files ?? 0) };
}
