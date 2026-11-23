import type { Database } from "@/integrations/supabase/types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

/** Columns hidden from the public snapshot. */
type Internal = "inbox" | "inbox_path" | "media_error" | "poster_time" | "poster_source";

export type Project = Omit<Row<"projects">, Internal>;
export type Brand = Omit<Row<"brands">, "inbox">;
export type SectionMedia = Omit<Row<"section_media">, Internal>;
export type Testimonial = Omit<Row<"testimonials">, Internal>;
export type Service = Omit<Row<"services">, Internal>;
export type Faq = Row<"faqs">;
export type BeforeAfter = Omit<Row<"before_after">, Internal>;
export type SiteSettingsRow = Row<"site_settings">;
export type Discipline = Database["public"]["Enums"]["discipline"];
export type MediaStatus = Database["public"]["Enums"]["media_status"];

export type Stat = { key: string; label: string; value: number; suffix?: string; prefix?: string; todo?: boolean };
export type Tool = { name: string; group: "generative" | "finishing" | string };
export type ProcessStep = { title: string; text: string };

export type SiteCopy = {
  manifesto: { text: string };
  premium: { headline: string; sub: string };
  crafts: { headline: string; ai: string; editing: string };
  beforeAfter: { headline: string; sub: string };
  library: { headline: string; sub: string };
  process: { headline: string; steps: ProcessStep[] };
  toolkit: { headline: string; sub: string };
  proof: { headline: string };
  services: { headline: string };
  faq: { headline: string };
  finale: { headline: string; cta: string };
};

export type SiteSettings = Omit<SiteSettingsRow, "stats" | "tools" | "copy" | "layout"> & {
  layout: import("./layout").Layout;
  stats: Stat[];
  tools: Tool[];
  copy: SiteCopy;
};

export type SiteData = {
  settings: SiteSettings;
  projects: Project[];
  brands: Brand[];
  sectionMedia: Record<string, SectionMedia>;
  testimonials: Testimonial[];
  services: Service[];
  faqs: Faq[];
  beforeAfter: BeforeAfter[];
};

/** The published snapshot the media repo serves at /manifest.json. */
export type Manifest = {
  version: 1;
  generated_at: string;
  maintenance?: { enabled: boolean; message?: string | null };
  data: {
    site_settings: SiteSettingsRow | null;
    projects: Project[];
    brands: Brand[];
    section_media: SectionMedia[];
    testimonials: Testimonial[];
    services: Service[];
    faqs: Faq[];
    before_after: BeforeAfter[];
  };
};

export type SourceMode = "auto" | "github" | "supabase";
export type DataOrigin = "supabase" | "manifest" | "defaults";
