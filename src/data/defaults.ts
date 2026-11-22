// Bundled first-draft content (mirrors supabase/migrations/*_seed.sql).
// Used only if BOTH Supabase and manifest.json are unreachable, so the site never shows an error screen.
import type { SiteData, SiteSettings, SectionMedia } from "./types";

const now = "2026-11-22T00:00:00.000Z";

export const defaultSettings: SiteSettings = {
  id: 1,
  hero_headline: "Stories, generated and cut by hand.",
  hero_sub: "I'm Daniel Ogbeifun Osewe. I direct AI films and edit video for brands, artists and creators who need work that stops the scroll.",
  hero_cta_primary: "Watch the reel",
  hero_cta_secondary: "Start a project",
  credit_line: "An Xperience production · Founded by Daniel Ogbeifun Osewe",
  tagline: "PLAY · CONNECT · EVOLVE",
  contact_email: null,
  whatsapp: null,
  seo_title: "Xperience | AI Video & Video Editing Studio by Daniel Ogbeifun Osewe",
  seo_description: "AI films, ads and social edits, directed and cut by Daniel Ogbeifun Osewe at Xperience.",
  og_image_url: null,
  maintenance: false,
  maintenance_message: "We're polishing a few frames. Back very soon.",
  updated_at: now,
  stats: [
    { key: "projects", label: "Projects delivered", value: 0, suffix: "+", todo: true },
    { key: "views", label: "Views generated", value: 0, suffix: "M+", todo: true },
    { key: "turnaround", label: "Typical turnaround", value: 0, suffix: " days", todo: true },
    { key: "repeat", label: "Repeat clients", value: 0, suffix: "%", todo: true },
  ],
  tools: [
    ...["Veo", "Kling", "Runway", "Midjourney", "ElevenLabs"].map((name) => ({ name, group: "generative" })),
    ...["Premiere Pro", "DaVinci Resolve", "After Effects", "CapCut"].map((name) => ({ name, group: "finishing" })),
  ],
  copy: {
    manifesto: { text: "AI gives me a thousand shots. Editing decides which twelve matter." },
    premium: { headline: "Selected work.", sub: "The pieces I'd show first, each with the brief, my role and the result." },
    crafts: {
      headline: "Two crafts. One eye.",
      ai: "Concept to finished film with generative tools. Ads, music videos, product films, worlds that don't exist yet.",
      editing: "Your footage, cut for pace, colour and sound. YouTube, reels, commercials, documentaries.",
    },
    beforeAfter: { headline: "Raw in. Finished out.", sub: "Drag to see what happens between the first output and the final frame." },
    library: { headline: "Everything, sorted.", sub: "Filter by craft, format or industry." },
    process: {
      headline: "From brief to final cut, in five passes.",
      steps: [
        { title: "Brief", text: "You send the idea, references, deadline and any footage. I come back with questions and a plan." },
        { title: "Concept and boards", text: "Look, pacing and key shots agreed before anything is made." },
        { title: "Generate or shoot", text: "AI shots generated and directed, or your footage organised and logged." },
        { title: "Edit, grade, sound", text: "Cut for rhythm, coloured to match, mixed so it lands with or without sound." },
        { title: "Deliver", text: "Final files in every format you need, ready to post or run." },
      ],
    },
    toolkit: { headline: "The kit.", sub: "Generative models for the impossible shots, industry tools for the finish." },
    proof: { headline: "Clients don't hire a tool. They hire a result." },
    services: { headline: "Ways to work together." },
    faq: { headline: "Questions, answered." },
    finale: { headline: "Have footage? Have an idea? Let's make the cut.", cta: "Start a project" },
  },
};

const sm = (key: string, label: string): SectionMedia => ({
  key, label, prompt: null, desktop_url: null, mobile_url: null, poster_url: null, overlay_opacity: 0.6,
  published: true, media_status: "published", media_synced_at: null, created_at: now, updated_at: now,
});

export const SECTION_KEYS = [
  "hero", "manifesto", "premium-intro", "crafts-ai", "crafts-editing", "library", "process", "toolkit", "proof",
  "service-ai-ad", "service-music", "service-social", "service-longform", "finale",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

const svc = (slug: string, title: string, description: string, included: string[], sort_order: number) => ({
  id: `default-${slug}`, slug, title, description, included, turnaround: "TODO", price_from: "TODO",
  loop_url: null, poster_url: null, sort_order, published: true, media_status: "published" as const, media_synced_at: null, created_at: now, updated_at: now,
});

export const defaultData: SiteData = {
  settings: defaultSettings,
  projects: [],
  brands: [
    { slug: "xanctum", name: "Xanctum", line: "Brand film and launch visuals for a market repositioning" },
    { slug: "jobcondi", name: "Jobcondi", line: "Explainer and social videos for a career platform" },
    { slug: "xpers-streaming", name: "Xpers Streaming", line: "Launch promo and motion identity for a streaming app" },
  ].map((b, i) => ({ ...b, id: `default-${b.slug}`, website: null, logo_url: null, sort_order: i + 1, published: true, media_status: "published" as const, media_synced_at: null, created_at: now, updated_at: now })),
  sectionMedia: Object.fromEntries(SECTION_KEYS.map((k) => [k, sm(k, k)])),
  testimonials: [],
  services: [
    svc("ai-ad", "AI ad or product film", "A finished spot built with generative visuals, edited and scored for your channels.", ["Concept and boards", "Generated shots, directed", "Edit, grade and sound", "Cutdowns for each channel"], 1),
    svc("music", "Music video and visualizers", "Full videos, lyric visuals and loops that match the track's energy.", ["Treatment", "Full video or visualizer", "Lyric visuals", "Loops for streaming platforms"], 2),
    svc("social", "Monthly social edit pack", "A steady stream of short-form edits for Reels, TikTok and Shorts.", ["Monthly batch of short edits", "Captions and hooks", "Vertical-first formats", "Fast revision loop"], 3),
    svc("longform", "Long-form and YouTube editing", "Story-led edits for videos, documentaries and series, with grade and sound.", ["Story edit", "Colour grade", "Sound mix", "Thumbnails-ready stills"], 4),
  ],
  faqs: [
    ["Who owns the final video?", "You do. You get full commercial rights to the final delivered files."],
    ["How long does a project take?", "Most short pieces take TODO days from approved brief to delivery."],
    ["Can you work with footage I already have?", "Yes. Send it in any format and I'll mix it with generated shots where it helps."],
    ["How many revisions are included?", "TODO rounds of revisions are included in every project."],
    ["How do we start?", "Message me on WhatsApp or email with your idea and deadline. I'll reply with questions and a quote."],
  ].map(([question, answer], i) => ({ id: `default-faq-${i}`, question, answer, sort_order: i + 1, published: true, created_at: now, updated_at: now })),
  beforeAfter: [],
};
