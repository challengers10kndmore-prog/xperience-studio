/**
 * Main-admin helpers that need server secrets (Supabase JWT + admins table required):
 *   GET  /api/admin/status  -> last sync, last keep-alive, manifest time, current data source
 *   POST /api/admin/source  { data: auto|github|supabase }
 */
import { actionOf, err, json, readJson, sameOrigin } from "../_lib/http.js";
import { verifyAdmin } from "../_lib/supabase.js";
import { setSource, syncStatus, SOURCE_MODES, type SourceFile } from "../_lib/github.js";

export async function GET(req: Request) {
  if (!(await verifyAdmin(req))) return err(401, "Admins only.");
  if (actionOf(req) !== "status") return err(404, "Unknown action");
  try { return json(await syncStatus()); } catch (e) { return err(502, e instanceof Error ? e.message : "GitHub request failed"); }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err(403, "Bad origin");
  if (!(await verifyAdmin(req))) return err(401, "Admins only.");
  if (actionOf(req) !== "source") return err(404, "Unknown action");
  const { data } = await readJson<{ data: SourceFile["data"] }>(req);
  if (!data || !SOURCE_MODES.includes(data)) return err(400, "data must be auto, github or supabase");
  try { return json({ ok: true, source: await setSource(data) }); } catch (e) { return err(502, e instanceof Error ? e.message : "GitHub request failed"); }
}
