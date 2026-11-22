import { slugify } from "@/lib/utils";
import { adminApi, markDispatched, scheduleManifestRefresh } from "./api";
import { compressVideo, isVideoFile, VideoCompressionError } from "./compressVideo";
import { db, uploadToInbox, type AnyRow } from "./db";
import type { Resource } from "./resources";

export type Progress = { stage: "saving" | "compressing" | "uploading" | "publishing" | "done"; ratio?: number; note?: string };

const READONLY = new Set(["created_at", "updated_at", "media_synced_at", "media_error", "inbox", "inbox_path"]);

function clean(res: Resource, row: AnyRow) {
  const out: AnyRow = {};
  for (const [k, v] of Object.entries(row)) if (!READONLY.has(k)) out[k] = v;
  if ("slug" in out || res.fields.some((f) => f.name === "slug")) {
    const base = (out.slug as string) || (out.title as string) || (out.name as string) || "";
    if (base) out.slug = slugify(base);
  }
  return out;
}

/** Saves a row, then compresses + uploads any new media to the inbox and asks the sync Action to publish it. */
export async function saveResource(res: Resource, row: AnyRow, files: Record<string, File>, onProgress?: (p: Progress) => void): Promise<AnyRow> {
  onProgress?.({ stage: "saving" });
  const payload = clean(res, row);
  // media fields are written by the sync Action, never by the form, when a new file is being uploaded
  for (const f of Object.keys(files)) delete payload[f];
  const { data, error } = await db().from(res.table).upsert(payload, { onConflict: res.pk }).select().single();
  if (error) throw new Error(error.message);
  let saved = data as AnyRow;
  const id = String(saved[res.pk]);

  const entries = Object.entries(files);
  if (entries.length) {
    const inbox: Record<string, string> = { ...((saved.inbox as Record<string, string>) ?? {}) };
    for (const [field, original] of entries) {
      let file = original;
      const def = res.fields.find((f) => f.name === field);
      if (isVideoFile(file)) {
        onProgress?.({ stage: "compressing", ratio: 0, note: file.name });
        try {
          file = await compressVideo(file, (r) => onProgress?.({ stage: "compressing", ratio: r, note: file.name }), { loop: def?.type === "media" && def.loop });
        } catch (e) {
          onProgress?.({ stage: "compressing", note: e instanceof VideoCompressionError ? e.message : "Compression skipped" });
        }
      }
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${res.table}/${id}/${field}-${Date.now()}.${ext}`;
      onProgress?.({ stage: "uploading", ratio: 0, note: file.name });
      await uploadToInbox(path, file, (r) => onProgress?.({ stage: "uploading", ratio: r, note: file.name }));
      inbox[field] = path;
    }
    const upd = await db().from(res.table).update({ inbox, media_status: "pending", media_error: null }).eq(res.pk, id).select().single();
    if (upd.error) throw new Error(upd.error.message);
    saved = upd.data as AnyRow;
    onProgress?.({ stage: "publishing" });
    try {
      await adminApi.publish(res.table, id);
      markDispatched(res.table, id);
    } catch (e) {
      onProgress?.({ stage: "publishing", note: `Saved. Publishing will start within the hour (${e instanceof Error ? e.message : "dispatch failed"}).` });
    }
  } else {
    scheduleManifestRefresh();
  }
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
