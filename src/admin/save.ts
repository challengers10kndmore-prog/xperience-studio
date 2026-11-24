import { driveFileId } from "../../shared/drive";
import { slugify } from "@/lib/utils";
import { adminApi, markDispatched, scheduleManifestRefresh } from "./api";
import { compressVideo, isVideoFile, shouldCompress, VideoCompressionError } from "./compressVideo";
import { db, type AnyRow } from "./db";
import { ensureInboxRoom, uploadToInbox, type InboxEntry } from "./upload";
import type { Resource } from "./resources";

export type Progress = { stage: "checking" | "saving" | "compressing" | "uploading" | "publishing" | "done"; ratio?: number; note?: string };
export type SaveOptions = { compress?: boolean; original?: AnyRow | null };

const READONLY = new Set(["created_at", "updated_at", "media_synced_at", "media_error", "inbox", "inbox_path", "cover_url", "og_url", "poster_time", "poster_source", "frames"]);
const COVER_FIELDS = ["caption", "title", "discipline", "brief"];

function clean(res: Resource, row: AnyRow) {
  const out: AnyRow = {};
  for (const [k, v] of Object.entries(row)) if (!READONLY.has(k)) out[k] = v;
  if (res.fields.some((f) => f.name === "slug")) {
    const base = (out.slug as string) || (out.title as string) || (out.name as string) || "";
    if (base) out.slug = slugify(base);
  }
  return out;
}

async function dispatch(res: Resource, id: string, onProgress?: (p: Progress) => void) {
  onProgress?.({ stage: "publishing" });
  try { await adminApi.publish(res.table, id); markDispatched(res.table, id); }
  catch (e) { onProgress?.({ stage: "publishing", note: `Saved. Publishing will start within the hour (${e instanceof Error ? e.message : "dispatch failed"}).` }); }
}

/** Adds instructions/uploads to a row's inbox, marks it pending and starts a sync. */
export async function queueForSync(res: Resource, id: string, add: Record<string, unknown>, onProgress?: (p: Progress) => void) {
  const cur = await db().from(res.table).select("inbox").eq(res.pk, id).single();
  if (cur.error) throw new Error(cur.error.message);
  const inbox = { ...((cur.data?.inbox as Record<string, unknown>) ?? {}), ...add };
  const upd = await db().from(res.table).update({ inbox, media_status: "pending", media_error: null }).eq(res.pk, id).select().single();
  if (upd.error) throw new Error(upd.error.message);
  await dispatch(res, id, onProgress);
  return upd.data as AnyRow;
}

/** Saves a row; uploads new media (in 45 MB parts when needed) and asks the sync Action to publish it. */
export async function saveResource(res: Resource, row: AnyRow, files: Record<string, File>, onProgress?: (p: Progress) => void, opts: SaveOptions = {}): Promise<AnyRow> {
  const entries = Object.entries(files);
  if (entries.length) {
    onProgress?.({ stage: "checking", note: "Checking the upload inbox has room" });
    await ensureInboxRoom(entries.reduce((s, [, f]) => s + f.size, 0));
  }
  onProgress?.({ stage: "saving" });
  const payload = clean(res, row);
  for (const f of Object.keys(files)) delete payload[f]; // media fields are written by the sync Action
  if (!row[res.pk]) payload.media_status = "published"; // a brand-new row isn't "pending" until a file actually arrives
  const { data, error } = await db().from(res.table).upsert(payload, { onConflict: res.pk }).select().single();
  if (error) throw new Error(error.message);
  let saved = data as AnyRow;
  const id = String(saved[res.pk]);

  const add: Record<string, unknown> = {};
  for (const [field, original] of entries) {
    let file = original;
    const def = res.fields.find((f) => f.name === field);
    if (opts.compress && isVideoFile(file) && shouldCompress(file)) {
      onProgress?.({ stage: "compressing", ratio: 0, note: file.name });
      try { file = await compressVideo(file, (r) => onProgress?.({ stage: "compressing", ratio: r, note: file.name }), { loop: def?.type === "media" && def.loop }); }
      catch (e) { onProgress?.({ stage: "compressing", note: e instanceof VideoCompressionError ? e.message : "Compression skipped: uploading the original in pieces." }); }
    }
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    onProgress?.({ stage: "uploading", ratio: 0, note: file.name });
    const entry: InboxEntry = await uploadToInbox(`${res.table}/${id}/${field}-${Date.now()}.${ext}`, file, (r, note) => onProgress?.({ stage: "uploading", ratio: r, note: note ? `${file.name} · ${note}` : file.name }));
    add[field] = entry;
  }
  // a new Google Drive link (and no file uploaded) -> the sync downloads it and makes the preview + poster
  if (res.table === "projects" && !add.video_url) {
    const was = driveFileId(opts.original?.source_url as string | undefined), now = driveFileId(saved.source_url as string | undefined);
    if (now && now !== was) add.video_url = { drive: now };
  }
  // a caption/title change on a published project re-renders its cover card
  if (res.table === "projects" && opts.original && saved.poster_url && !entries.length && COVER_FIELDS.some((k) => (opts.original as AnyRow)[k] !== saved[k])) add._cover = true;

  if (Object.keys(add).length) saved = await queueForSync(res, id, add, onProgress);
  else scheduleManifestRefresh();
  onProgress?.({ stage: "done" });
  return saved;
}

export async function retryPublish(res: Resource, row: AnyRow) {
  const id = String(row[res.pk]);
  await db().from(res.table).update({ media_status: "pending", media_error: null }).eq(res.pk, id);
  await adminApi.publish(res.table, id);
  markDispatched(res.table, id);
}

export async function deleteResource(res: Resource, row: AnyRow) {
  const { error } = await db().from(res.table).delete().eq(res.pk, String(row[res.pk]));
  if (error) throw new Error(error.message);
  scheduleManifestRefresh();
}

export async function saveOrder(res: Resource, ids: string[], column = "sort_order") {
  await Promise.all(ids.map((id, i) => db().from(res.table).update({ [column]: i + 1 }).eq(res.pk, id)));
  scheduleManifestRefresh();
}
