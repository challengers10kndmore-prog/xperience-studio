// Typed access to public (VITE_) configuration. Secrets never live here.
const e = import.meta.env;

export const env = {
  supabaseUrl: e.VITE_SUPABASE_URL ?? "",
  supabaseKey: e.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  siteUrl: (e.VITE_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, ""),
  mediaBaseUrl: (e.VITE_MEDIA_BASE_URL || "https://challengers10kndmore-prog.github.io/xperience-media").replace(/\/$/, ""),
  mediaHost: (e.VITE_MEDIA_HOST || "github") as "github" | "r2",
} as const;

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseKey);
