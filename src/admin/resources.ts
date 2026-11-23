import type { AnyRow } from "./db";

export type FieldDef =
  | { name: string; label: string; type: "text" | "textarea" | "url" | "email" | "number"; help?: string; placeholder?: string; required?: boolean }
  | { name: string; label: string; type: "bool"; help?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; help?: string }
  | { name: string; label: string; type: "tags"; help?: string }
  | { name: string; label: string; type: "brand"; help?: string }
  | { name: string; label: string; type: "media"; accept: "video" | "image"; loop?: boolean; help?: string };

export type Resource = {
  key: string;
  table: string;
  pk: "id" | "key";
  title: string;
  singular: string;
  description?: string;
  fields: FieldDef[];
  summary: (r: AnyRow) => { primary: string; secondary?: string; thumb?: string | null };
  sortable?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  hasMedia?: boolean;
  defaults?: () => AnyRow;
};

export const DISCIPLINES = [
  { value: "ai", label: "AI Video" },
  { value: "editing", label: "Video Editing" },
];
export const ASPECTS = ["16:9", "9:16", "1:1", "4:5", "21:9"].map((v) => ({ value: v, label: v }));
export const CATEGORIES: Record<string, string[]> = {
  ai: ["ads", "music-videos", "product-films", "short-films", "worlds", "social"],
  editing: ["youtube", "reels", "commercials", "documentaries", "music-videos", "events"],
};

const str = (v: unknown) => (v == null ? "" : String(v));

export const resources: Resource[] = [
  {
    key: "projects", table: "projects", pk: "id", title: "Projects", singular: "project", hasMedia: true, sortable: true, canCreate: true, canDelete: true,
    description: "Every film in the Work Library. Upload a video and it's compressed, sent to the inbox, then published to the media host automatically.",
    summary: (r) => ({ primary: str(r.title), secondary: `${r.discipline === "ai" ? "AI Video" : "Editing"}${r.category ? ` · ${r.category}` : ""}${r.is_premium ? " · Premium" : ""}${r.is_featured ? " · Featured" : ""}`, thumb: r.poster_url as string | null }),
    defaults: () => ({ discipline: "ai", aspect_ratio: "16:9", published: false, tools: [], media_status: "published" }),
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug (URL name)", type: "text", help: "Leave empty to make one from the title." },
      { name: "discipline", label: "Discipline", type: "select", options: DISCIPLINES },
      { name: "category", label: "Category", type: "text", help: "e.g. ads, music-videos, youtube, reels" },
      { name: "subcategory", label: "Sub-category / industry", type: "text" },
      { name: "aspect_ratio", label: "Format", type: "select", options: ASPECTS },
      { name: "video_url", label: "Video", type: "media", accept: "video" },
      { name: "poster_url", label: "Poster image (optional, one is made from the video)", type: "media", accept: "image" },
      { name: "full_video_url", label: "Full-length / master link (download or external)", type: "url" },
      { name: "duration_s", label: "Duration (seconds, auto-filled)", type: "number" },
      { name: "description", label: "Short description", type: "textarea" },
      { name: "brief", label: "Brief", type: "textarea" },
      { name: "role", label: "My role", type: "textarea" },
      { name: "result", label: "Result", type: "textarea" },
      { name: "tools", label: "Tools", type: "tags" },
      { name: "brand_id", label: "Client brand", type: "brand" },
      { name: "is_xperience_original", label: "Xperience Original", type: "bool", help: "Shows the gradient tag. Use for Xperience's own projects." },
      { name: "is_featured", label: "Featured (hero video shards)", type: "bool" },
      { name: "is_premium", label: "Premium sample", type: "bool" },
      { name: "published", label: "Published", type: "bool" },
    ],
  },
  {
    key: "section-media", table: "section_media", pk: "key", title: "Section videos", singular: "section video", hasMedia: true,
    description: "Background loops behind each section (8–10 s, seamless, no audio, left third dark), plus the two hero videos: “Hero: assembly” (8 s, played as frames you scrub with the cursor) and “Hero: idle loop” (8 s). Upload a 16:9 desktop and a 9:16 mobile version of each.",
    summary: (r) => ({ primary: str(r.label || r.key), secondary: `${r.desktop_url ? "Desktop ✓" : "Desktop: placeholder"} · ${r.mobile_url ? "Mobile ✓" : "Mobile: placeholder"}${r.key === "hero-assembly" ? ` · ${Object.keys((r.frames as object) ?? {}).length ? "frames ready" : "no frames yet"}` : ""}`, thumb: r.poster_url as string | null }),
    fields: [
      { name: "label", label: "Label", type: "text" },
      { name: "desktop_url", label: "Desktop loop (16:9)", type: "media", accept: "video", loop: true },
      { name: "mobile_url", label: "Mobile loop (9:16)", type: "media", accept: "video", loop: true },
      { name: "poster_url", label: "Poster image (optional; for Hero: assembly use the END frame. One is made automatically)", type: "media", accept: "image" },
      { name: "overlay_opacity", label: "Dark overlay (0 to 1)", type: "number", help: "Higher = darker. Keeps text readable." },
      { name: "prompt", label: "Generation prompt (reference)", type: "textarea" },
      { name: "published", label: "Show loop", type: "bool" },
    ],
  },
  {
    key: "brands", table: "brands", pk: "id", title: "Brands", singular: "brand", hasMedia: true, sortable: true, canCreate: true, canDelete: true,
    description: "The “Trusted by” wall. Transparent PNG or SVG logos. Don't add Xperience itself.",
    summary: (r) => ({ primary: str(r.name), secondary: str(r.line), thumb: r.logo_url as string | null }),
    defaults: () => ({ published: true, media_status: "published" }),
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "line", label: "What we made", type: "text" },
      { name: "website", label: "Website", type: "url" },
      { name: "logo_url", label: "Logo (transparent PNG or SVG)", type: "media", accept: "image" },
      { name: "published", label: "Published", type: "bool" },
    ],
  },
  {
    key: "testimonials", table: "testimonials", pk: "id", title: "Testimonials", singular: "testimonial", hasMedia: true, sortable: true, canCreate: true, canDelete: true,
    summary: (r) => ({ primary: str(r.name), secondary: [r.role, r.company].filter(Boolean).join(", "), thumb: r.poster_url as string | null }),
    defaults: () => ({ published: false, media_status: "published" }),
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "role", label: "Role", type: "text" },
      { name: "company", label: "Company", type: "text" },
      { name: "brand_id", label: "Brand", type: "brand" },
      { name: "quote", label: "Quote", type: "textarea" },
      { name: "video_url", label: "Video testimonial (optional)", type: "media", accept: "video" },
      { name: "published", label: "Published", type: "bool" },
    ],
  },
  {
    key: "services", table: "services", pk: "id", title: "Services", singular: "service", hasMedia: true, sortable: true, canCreate: true, canDelete: true,
    summary: (r) => ({ primary: str(r.title), secondary: `${str(r.turnaround) || "—"} · from ${str(r.price_from) || "—"}`, thumb: r.poster_url as string | null }),
    defaults: () => ({ published: true, included: [], media_status: "published" }),
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "included", label: "What's included", type: "tags" },
      { name: "turnaround", label: "Typical turnaround", type: "text", placeholder: "e.g. 5–7 days" },
      { name: "price_from", label: "From price (optional)", type: "text", placeholder: "e.g. $450" },
      { name: "loop_url", label: "Hover loop (3 s, 4:5)", type: "media", accept: "video", loop: true },
      { name: "published", label: "Published", type: "bool" },
    ],
  },
  {
    key: "faqs", table: "faqs", pk: "id", title: "FAQs", singular: "FAQ", sortable: true, canCreate: true, canDelete: true,
    summary: (r) => ({ primary: str(r.question), secondary: str(r.answer).slice(0, 90) }),
    defaults: () => ({ published: true }),
    fields: [
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer", type: "textarea", required: true },
      { name: "published", label: "Published", type: "bool" },
    ],
  },
  {
    key: "before-after", table: "before_after", pk: "id", title: "Before / After", singular: "pair", hasMedia: true, sortable: true, canCreate: true, canDelete: true,
    description: "Raw vs final pairs. Use clips with the same length and framing so the wipe lines up.",
    summary: (r) => ({ primary: str(r.title), secondary: str(r.label), thumb: r.poster_url as string | null }),
    defaults: () => ({ published: false, media_status: "published" }),
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "label", label: "Tab label", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "before_url", label: "Before (raw)", type: "media", accept: "video", loop: true },
      { name: "after_url", label: "After (final)", type: "media", accept: "video", loop: true },
      { name: "published", label: "Published", type: "bool" },
    ],
  },
];

export const resourceByKey = (k: string) => resources.find((r) => r.key === k);
