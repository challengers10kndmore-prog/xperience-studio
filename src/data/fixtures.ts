import type { Manifest } from "./types";

const t = "2026-11-22T00:00:00.000Z";
export const fixtureManifest: Manifest = {
  version: 1,
  generated_at: t,
  maintenance: { enabled: false, message: null },
  data: {
    site_settings: {
      id: 1, hero_headline: "From the manifest.", hero_sub: "sub", hero_cta_primary: "Watch the reel", hero_cta_secondary: "Start a project",
      credit_line: "An Xperience production · Founded by Daniel Ogbeifun Osewe", tagline: "PLAY · CONNECT · EVOLVE", contact_email: "hi@example.com",
      whatsapp: null, seo_title: "t", seo_description: "d", og_image_url: null, maintenance: false, maintenance_message: null,
      stats: [], tools: [], copy: {}, updated_at: t,
    },
    projects: [
      {
        id: "p1", title: "Neon Genesis Spot", slug: "neon-genesis-spot", discipline: "ai", category: "ads", subcategory: null, aspect_ratio: "16:9",
        duration_s: 32, description: "d", brief: "b", role: "r", result: "res", tools: ["Veo"], brand_id: null, is_featured: true, is_premium: true,
        premium_order: 1, is_xperience_original: true, sort_order: 1, published: true, video_url: "v/p1.mp4", poster_url: "p/p1.jpg",
        teaser_url: "t/p1.mp4", full_video_url: null, media_status: "published", media_synced_at: t, created_at: t, updated_at: t,
      },
      {
        id: "p2", title: "Creator Cut", slug: "creator-cut", discipline: "editing", category: "youtube", subcategory: null, aspect_ratio: "9:16",
        duration_s: 58, description: null, brief: null, role: null, result: null, tools: [], brand_id: null, is_featured: false, is_premium: false,
        premium_order: null, is_xperience_original: false, sort_order: 2, published: true, video_url: "v/p2.mp4", poster_url: "p/p2.jpg",
        teaser_url: null, full_video_url: "https://github.com/o/r/releases/download/m/p2.mp4", media_status: "published", media_synced_at: t, created_at: t, updated_at: t,
      },
    ],
    brands: [],
    section_media: [{ key: "hero", label: "Hero", prompt: null, desktop_url: "s/hero-desktop.mp4", mobile_url: "s/hero-mobile.mp4", poster_url: "s/hero-desktop.jpg", overlay_opacity: 0.5, published: true, media_status: "published", media_synced_at: t, created_at: t, updated_at: t }],
    testimonials: [],
    services: [],
    faqs: [],
    before_after: [],
  },
};
