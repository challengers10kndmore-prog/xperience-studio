import { getSupabase } from "@/lib/supabase";

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* not JSON (e.g. dev server without /api) */ }
  if (!res.ok || body === null) {
    const msg = (body as { error?: string } | null)?.error
      ?? (res.status === 404 ? "Server functions aren't running here (they run on Vercel)." : `HTTP ${res.status}`);
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export type SyncStatus = {
  lastSync: { status: string; conclusion: string | null; updated_at: string; html_url: string } | null;
  lastKeepAlive: { status: string; conclusion: string | null; updated_at: string; html_url: string } | null;
  manifestGeneratedAt: string | null;
  keepAliveAt: string | null;
  source: { data: "auto" | "github" | "supabase"; maintenance?: { enabled: boolean; message: string | null } };
};

export const adminApi = {
  publish: (table: string, id?: string) => call<{ ok: true }>("/api/publish", { method: "POST", body: JSON.stringify({ table, id }) }),
  status: () => call<SyncStatus>("/api/admin/status"),
  setSource: (data: "auto" | "github" | "supabase") => call<{ ok: true }>("/api/admin/source", { method: "POST", body: JSON.stringify({ data }) }),
};

// --- remember dispatches so a pending item shows "Publishing" rather than "Pending" ---
const KEY = "xp-admin-dispatched";
export function markDispatched(table: string, id: string) {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
    m[`${table}:${id}`] = Date.now();
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch { /* ignore */ }
}
export function dispatchedAt(table: string, id: string): number | null {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>)[`${table}:${id}`] ?? null; } catch { return null; }
}

let manifestTimer: ReturnType<typeof setTimeout> | null = null;
/** After text edits: regenerate manifest.json (debounced so a burst of saves = one Action run). */
export function scheduleManifestRefresh(delay = 4000) {
  if (manifestTimer) clearTimeout(manifestTimer);
  manifestTimer = setTimeout(() => { adminApi.publish("manifest").catch(() => {}); }, delay);
}
