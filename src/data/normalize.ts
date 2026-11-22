import { defaultData, defaultSettings } from "./defaults";
import type { Manifest, SiteData, SiteSettings, SiteSettingsRow, SectionMedia, Stat, Tool, SiteCopy } from "./types";

const bySort = <T extends { sort_order?: number | null }>(a: T, b: T) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

function deepMerge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over)) return (over as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)?.[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" && !Array.isArray(v) ? deepMerge(b, v) : v ?? b;
  }
  return out as T;
}

export function normalizeSettings(row: SiteSettingsRow | null | undefined): SiteSettings {
  if (!row) return defaultSettings;
  const stats = Array.isArray(row.stats) && row.stats.length ? (row.stats as unknown as Stat[]) : defaultSettings.stats;
  const tools = Array.isArray(row.tools) && row.tools.length ? (row.tools as unknown as Tool[]) : defaultSettings.tools;
  const copy = deepMerge<SiteCopy>(defaultSettings.copy, row.copy);
  const merged = { ...defaultSettings } as SiteSettings;
  for (const [k, v] of Object.entries(row)) if (v !== null && v !== undefined) (merged as Record<string, unknown>)[k] = v;
  return { ...merged, stats, tools, copy };
}

export type RawTables = Manifest["data"];

export function normalize(raw: RawTables): SiteData {
  const sectionMedia: Record<string, SectionMedia> = { ...defaultData.sectionMedia };
  for (const s of raw.section_media ?? []) sectionMedia[s.key] = s;
  return {
    settings: normalizeSettings(raw.site_settings),
    projects: [...(raw.projects ?? [])].filter((p) => p.published).sort(bySort),
    brands: raw.brands?.length ? [...raw.brands].filter((b) => b.published).sort(bySort) : defaultData.brands,
    sectionMedia,
    testimonials: [...(raw.testimonials ?? [])].filter((t) => t.published).sort(bySort),
    services: raw.services?.length ? [...raw.services].filter((s) => s.published).sort(bySort) : defaultData.services,
    faqs: raw.faqs?.length ? [...raw.faqs].filter((f) => f.published).sort(bySort) : defaultData.faqs,
    beforeAfter: [...(raw.before_after ?? [])].filter((b) => b.published).sort(bySort),
  };
}
