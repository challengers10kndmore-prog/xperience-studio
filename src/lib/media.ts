/**
 * The ONE place that knows where videos live.
 * Database rows store media as paths relative to the media host ("v/<id>.mp4").
 * Moving from GitHub Pages to Cloudflare R2 = change VITE_MEDIA_BASE_URL / VITE_MEDIA_HOST. Nothing else.
 */
import { env } from "./env";

export type MediaHost = "github" | "r2";

export const mediaConfig = {
  host: env.mediaHost as MediaHost,
  baseUrl: env.mediaBaseUrl,
};

export const mediaPaths = {
  video: (id: string) => `v/${id}.mp4`,
  teaser: (id: string) => `t/${id}.mp4`,
  poster: (id: string) => `p/${id}.jpg`,
  section: (key: string, variant: "desktop" | "mobile") => `s/${key}-${variant}.mp4`,
  sectionPoster: (key: string) => `s/${key}-desktop.jpg`,
  brand: (id: string) => `b/${id}.png`,
  manifest: () => "manifest.json",
  source: () => "source.json",
};

/** Turns a stored media reference into a URL the browser can load. Absolute URLs pass through. */
export function mediaUrl(ref?: string | null, base = mediaConfig.baseUrl): string | undefined {
  if (!ref) return undefined;
  if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:") || ref.startsWith("blob:")) return ref;
  if (ref.startsWith("/")) return ref; // file shipped with the site (public/)
  return `${base.replace(/\/$/, "")}/${ref.replace(/^\.?\//, "")}`;
}

/** Release assets are served as octet-stream: never put them in a <video>. */
export function isPlayableUrl(url?: string | null) {
  if (!url) return false;
  return !/github\.com\/.+\/releases\/download\//i.test(url);
}
