/**
 * Where the public site gets its data.
 *  - source.json on the media host picks the mode: auto | github | supabase (cached 60 s).
 *  - auto: Supabase (4 s timeout). On error / timeout / paused (5xx, 540) -> manifest.json, flagged "fallback"
 *    and remembered for 5 minutes in sessionStorage.
 *  - If every source fails, bundled defaults render. The site never shows an error screen.
 * Plain fetch against PostgREST keeps supabase-js out of the public bundle.
 */
import columns from "../../shared/publicColumns.json";
import { env, hasSupabase } from "@/lib/env";
import { mediaPaths, mediaUrl } from "@/lib/media";
import { normalize, type RawTables } from "./normalize";
import { defaultData } from "./defaults";
import type { DataOrigin, Manifest, SiteData, SourceMode } from "./types";

export const SUPABASE_TIMEOUT_MS = 4000;
export const SOURCE_CACHE_MS = 60_000;
export const FALLBACK_MEMORY_MS = 5 * 60_000;
const FALLBACK_KEY = "xp-data-fallback-until";

export type SourceFile = { data: SourceMode; maintenance?: { enabled: boolean; message?: string | null } };
export type LoadResult = {
  data: SiteData;
  origin: DataOrigin;
  mode: SourceMode;
  fallback: boolean;
  maintenance: { enabled: boolean; message: string | null };
  generatedAt?: string;
};

type Fetch = typeof fetch;
let sourceCache: { at: number; value: SourceFile } | null = null;

export function _resetSourceCache() { sourceCache = null; }

function ss(): Storage | null {
  try { return typeof sessionStorage === "undefined" ? null : sessionStorage; } catch { return null; }
}

export function fallbackRemembered(now = Date.now()) {
  const v = Number(ss()?.getItem(FALLBACK_KEY) ?? 0);
  return v > now;
}
export function rememberFallback(now = Date.now()) { ss()?.setItem(FALLBACK_KEY, String(now + FALLBACK_MEMORY_MS)); }
export function clearFallback() { ss()?.removeItem(FALLBACK_KEY); }

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), ms);
  try { return await fn(ctrl.signal); } finally { clearTimeout(t); }
}

export async function readSource(f: Fetch = fetch, now = Date.now()): Promise<SourceFile> {
  if (sourceCache && now - sourceCache.at < SOURCE_CACHE_MS) return sourceCache.value;
  let value: SourceFile = { data: "auto" };
  try {
    const res = await withTimeout(2500, (signal) => f(mediaUrl(mediaPaths.source())!, { signal, cache: "no-cache" }));
    if (res.ok) {
      const j = (await res.json()) as Partial<SourceFile>;
      if (j && (j.data === "auto" || j.data === "github" || j.data === "supabase")) value = { data: j.data, maintenance: j.maintenance };
    }
  } catch { /* missing source.json = auto */ }
  sourceCache = { at: now, value };
  return value;
}

export class SourceError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export async function loadFromSupabase(f: Fetch = fetch, timeoutMs = SUPABASE_TIMEOUT_MS): Promise<RawTables> {
  if (!hasSupabase) throw new SourceError("supabase not configured");
  const headers = { apikey: env.supabaseKey, Authorization: `Bearer ${env.supabaseKey}`, Accept: "application/json" };
  const get = async (table: keyof typeof columns, signal: AbortSignal) => {
    const res = await f(`${env.supabaseUrl}/rest/v1/${table}?select=${columns[table]}`, { headers, signal });
    if (!res.ok) throw new SourceError(`${table}: HTTP ${res.status}`, res.status);
    return res.json();
  };
  return withTimeout(timeoutMs, async (signal) => {
    const [site_settings, projects, brands, section_media, testimonials, services, faqs, before_after] = await Promise.all([
      get("site_settings", signal), get("projects", signal), get("brands", signal), get("section_media", signal),
      get("testimonials", signal), get("services", signal), get("faqs", signal), get("before_after", signal),
    ]);
    return { site_settings: site_settings[0] ?? null, projects, brands, section_media, testimonials, services, faqs, before_after };
  });
}

export async function loadManifest(f: Fetch = fetch): Promise<Manifest> {
  const res = await withTimeout(8000, (signal) => f(mediaUrl(mediaPaths.manifest())!, { signal, cache: "no-cache" }));
  if (!res.ok) throw new SourceError(`manifest: HTTP ${res.status}`, res.status);
  const m = (await res.json()) as Manifest;
  if (!m || typeof m !== "object" || !m.data) throw new SourceError("manifest: invalid");
  return m;
}

export async function loadSiteData(f: Fetch = fetch): Promise<LoadResult> {
  const source = await readSource(f);
  const mode = source.data;
  const srcMaint = source.maintenance?.enabled ? source.maintenance : null;
  const finish = (raw: RawTables | null, origin: DataOrigin, fallback: boolean, manifest?: Manifest): LoadResult => {
    const data = raw ? normalize(raw) : defaultData;
    const enabled = Boolean(srcMaint?.enabled || manifest?.maintenance?.enabled || data.settings.maintenance);
    const message = srcMaint?.message ?? manifest?.maintenance?.message ?? data.settings.maintenance_message ?? null;
    return { data, origin, mode, fallback, maintenance: { enabled, message }, generatedAt: manifest?.generated_at };
  };

  const tryManifest = async (fallback: boolean): Promise<LoadResult | null> => {
    try { const m = await loadManifest(f); return finish(m.data, "manifest", fallback, m); } catch { return null; }
  };
  const trySupabase = async (): Promise<LoadResult | null> => {
    try { return finish(await loadFromSupabase(f), "supabase", false); } catch { return null; }
  };

  if (mode === "github") return (await tryManifest(false)) ?? (await trySupabase()) ?? finish(null, "defaults", true);
  if (mode === "supabase") return (await trySupabase()) ?? (await tryManifest(true)) ?? finish(null, "defaults", true);

  // auto
  if (!fallbackRemembered()) {
    const s = await trySupabase();
    if (s) return s;
    rememberFallback();
  }
  return (await tryManifest(true)) ?? (await trySupabase()) ?? finish(null, "defaults", true);
}
