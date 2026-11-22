/**
 * POST /api/publish  { table, id }   Authorization: Bearer <Supabase access token>
 * Verifies the admin server-side (JWT + admins table), then fires repository_dispatch "media-uploaded" on the media repo.
 * table "manifest" = just regenerate manifest.json (after text-only edits).
 */
import { err, json, readJson, sameOrigin } from "./_lib/http.js";
import { verifyAdmin } from "./_lib/supabase.js";
import { dispatchSync } from "./_lib/github.js";

export const TABLES = ["projects", "section_media", "brands", "testimonials", "services", "before_after", "manifest"] as const;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err(403, "Bad origin");
  const admin = await verifyAdmin(req);
  if (!admin) return err(401, "Admins only.");
  const { table, id } = await readJson<{ table: string; id: string }>(req);
  if (!table || !(TABLES as readonly string[]).includes(table)) return err(400, "Unknown table");
  if (id !== undefined && (typeof id !== "string" || id.length > 100)) return err(400, "Bad id");
  try {
    await dispatchSync({ table, ...(id ? { id } : {}) });
    return json({ ok: true, status: "publishing" });
  } catch (e) {
    return err(502, e instanceof Error ? e.message : "dispatch failed");
  }
}
