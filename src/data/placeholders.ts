// Clearly-marked stand-ins shown ONLY while no real projects are published, so every section can be reviewed.
// They carry `placeholder: true` and render a visible "Placeholder" tag.
import type { Project } from "./types";

export type SiteProject = Project & { placeholder?: boolean };

const t = "2026-11-22T00:00:00.000Z";
const base = {
  subcategory: null, description: null, brand_id: null, full_video_url: null, video_url: null, poster_url: null, teaser_url: null,
  published: true, media_status: "published" as const, media_synced_at: null, created_at: t, updated_at: t, is_featured: true,
};

const raw: Omit<SiteProject, "placeholder">[] = [
  { id: "ph-1", slug: "placeholder-ai-ad", title: "Liquid Chrome", discipline: "ai" as const, category: "ads", aspect_ratio: "16:9", duration_s: 32,
    brief: "Launch spot for a product that doesn't exist yet.", role: "Direction, generation, edit", result: "TODO real result", tools: ["Veo", "Runway", "Premiere Pro"],
    is_premium: true, premium_order: 1, is_xperience_original: true, sort_order: 1, ...base },
  { id: "ph-2", slug: "placeholder-music", title: "Night Signal", discipline: "ai" as const, category: "music-videos", aspect_ratio: "16:9", duration_s: 184,
    brief: "Music video built from generated worlds.", role: "Concept, AI direction, cut", result: "TODO real result", tools: ["Kling", "Midjourney", "DaVinci Resolve"],
    is_premium: true, premium_order: 2, is_xperience_original: false, sort_order: 2, ...base },
  { id: "ph-3", slug: "placeholder-youtube", title: "The Long Cut", discipline: "editing" as const, category: "youtube", aspect_ratio: "16:9", duration_s: 742,
    brief: "Story-led edit from 6 hours of footage.", role: "Edit, grade, sound", result: "TODO real result", tools: ["Premiere Pro", "DaVinci Resolve"],
    is_premium: true, premium_order: 3, is_xperience_original: false, sort_order: 3, ...base },
  { id: "ph-4", slug: "placeholder-reel", title: "Ninety Frames", discipline: "editing" as const, category: "reels", aspect_ratio: "9:16", duration_s: 29,
    brief: "Vertical cut for Reels and Shorts.", role: "Edit", result: "TODO", tools: ["CapCut", "After Effects"],
    is_premium: false, premium_order: null, is_xperience_original: false, sort_order: 4, ...base },
  { id: "ph-5", slug: "placeholder-product", title: "Glass Form", discipline: "ai" as const, category: "product-films", aspect_ratio: "1:1", duration_s: 15,
    brief: "Product loop.", role: "Generation, edit", result: "TODO", tools: ["Runway"],
    is_premium: false, premium_order: null, is_xperience_original: true, sort_order: 5, ...base },
  { id: "ph-6", slug: "placeholder-doc", title: "Field Notes", discipline: "editing" as const, category: "documentaries", aspect_ratio: "16:9", duration_s: 1260,
    brief: "Short documentary.", role: "Edit, sound", result: "TODO", tools: ["DaVinci Resolve"],
    is_premium: false, premium_order: null, is_xperience_original: false, sort_order: 6, ...base },
];
export const placeholderProjects: SiteProject[] = raw.map((p) => ({ ...p, placeholder: true }));

export function siteProjects(projects: Project[]): SiteProject[] {
  const real = projects.filter((p) => p.video_url || p.poster_url);
  return real.length ? real : placeholderProjects;
}

export const premiumOf = (ps: SiteProject[]) =>
  ps.filter((p) => p.is_premium).sort((a, b) => (a.premium_order ?? 99) - (b.premium_order ?? 99)).slice(0, 6);

export const featuredOf = (ps: SiteProject[]) => ps.filter((p) => p.is_featured).slice(0, 7);

/** Stable hue pair per project for generated poster art. */
export function artFor(id: string, discipline: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = discipline === "ai" ? "#2F6BFF" : "#C84BFF";
  const angle = h % 360;
  const x = 20 + (h % 60), y = 20 + ((h >> 3) % 60);
  return `radial-gradient(70% 60% at ${x}% ${y}%, ${a}66, transparent 70%), radial-gradient(60% 50% at ${100 - x}% ${100 - y}%, #7C3AED55, transparent 70%), linear-gradient(${angle}deg, #100E1A, #07060D)`;
}
