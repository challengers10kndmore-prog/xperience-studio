/**
 * Main-admin helpers that need server secrets (Supabase JWT + admins table required):
 *   GET  /api/admin/status  -> last sync, last keep-alive, manifest time, current data source
 *   POST /api/admin/source  { data: auto|github|supabase }
 *   POST /api/admin/drive   { links: "pasted text" } -> each Google Drive file (folders expanded) with its name and whether it's public
 */
import { actionOf, err, json, readJson, sameOrigin } from "../_lib/http.js";
import { verifyAdmin } from "../_lib/supabase.js";
import { setSource, syncStatus, SOURCE_MODES, type SourceFile } from "../_lib/github.js";
import { resolveDriveLinks } from "../_lib/drive.js";

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return err(401, "Admins only.");
  if (actionOf(req) !== "status") return err(404, "Unknown action");
  try { return json(await syncStatus()); } catch (e) { return err(502, e instanceof Error ? e.message : "GitHub request failed"); }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err(403, "Bad origin");
  if (!(await verifyAdmin(req))) return err(401, "Admins only.");
  const action = actionOf(req);
  if (action === "drive") {
    const { links } = await readJson<{ links: string }>(req);
    if (!links || typeof links !== "string" || links.length > 100_000) return err(400, "Paste one or more Google Drive links.");
    try { return json(await resolveDriveLinks(links)); } catch (e) { return err(502, e instanceof Error ? e.message : "Couldn't reach Google Drive"); }
  }
  if (action !== "source") return err(404, "Unknown action");
  const { data } = await readJson<{ data: SourceFile["data"] }>(req);
  if (!data || !SOURCE_MODES.includes(data)) return err(400, "data must be auto, github or supabase");
  try { return json({ ok: true, source: await setSource(data) }); } catch (e) { return err(502, e instanceof Error ? e.message : "GitHub request failed"); }
}
