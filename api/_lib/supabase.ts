import { envOr } from "./http.js";

export type AdminUser = { id: string; email?: string };

/** Verifies a Supabase access token AND that the user is in the admins table. Server-side only. */
export async function verifyAdmin(req: Request, f: typeof fetch = fetch): Promise<AdminUser | null> {
  const url = envOr("SUPABASE_URL") ?? envOr("VITE_SUPABASE_URL");
  const key = envOr("SUPABASE_SECRET_KEY");
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return null;
  const u = await f(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!u.ok) return null;
  const user = (await u.json()) as { id?: string; email?: string };
  if (!user?.id) return null;
  const a = await f(`${url}/rest/v1/admins?select=user_id&user_id=eq.${encodeURIComponent(user.id)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!a.ok) return null;
  const rows = (await a.json()) as unknown[];
  return rows.length ? { id: user.id, email: user.email } : null;
}

export async function pingSupabase(f: typeof fetch = fetch) {
  const url = envOr("SUPABASE_URL") ?? envOr("VITE_SUPABASE_URL");
  const key = envOr("SUPABASE_SECRET_KEY") ?? envOr("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return { ok: false, status: 0, latencyMs: 0, error: "not configured" };
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await f(`${url}/rest/v1/rpc/ping`, {
      method: "POST", signal: ctrl.signal,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}",
    });
    clearTimeout(timer);
    return { ok: r.ok, status: r.status, latencyMs: Date.now() - t0, error: r.ok ? null : `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, status: 0, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : "unreachable" };
  }
}
