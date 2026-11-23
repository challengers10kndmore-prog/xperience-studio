/** Home page sections Daniel can reorder / hide in admin > Website customization. The hero is always first, the footer last. */
export const HOME_SECTIONS = [
  { key: "work", label: "Work (full-screen reel)", hint: "Every published film, one at a time, with play / pause / next." },
  { key: "premium", label: "Selected work (premium chapters)", hint: "3 to 6 premium films as pinned full-screen chapters." },
  { key: "manifesto", label: "Manifesto", hint: "The one-line statement, revealed on scroll." },
  { key: "crafts", label: "Two crafts", hint: "AI Video / Video Editing split screen." },
  { key: "before-after", label: "Before / After", hint: "Raw vs final wipe slider." },
  { key: "process", label: "Process", hint: "The five passes on an edit timeline." },
  { key: "toolkit", label: "Toolkit", hint: "The two tool marquees." },
  { key: "proof", label: "Proof", hint: "Stats, Trusted by, testimonials." },
  { key: "services", label: "Services", hint: "Ways to work together." },
  { key: "faq", label: "FAQ", hint: "Questions and answers." },
  { key: "contact", label: "Contact (finale)", hint: "The big call to action and contact form." },
] as const;

export type SectionKey = (typeof HOME_SECTIONS)[number]["key"];
export type Layout = { order?: string[]; hidden?: string[] };

export const DEFAULT_ORDER: SectionKey[] = ["work", "manifesto", "premium", "crafts", "before-after", "process", "toolkit", "proof", "services", "faq", "contact"];
const KNOWN = new Set<string>(HOME_SECTIONS.map((s) => s.key));

/** Saved order first (unknown keys dropped), then any sections added since, at the end. */
export function orderedSections(layout?: Layout | null): SectionKey[] {
  const saved = (layout?.order ?? []).filter((k) => KNOWN.has(k)) as SectionKey[];
  const out = [...new Set(saved)];
  for (const k of DEFAULT_ORDER) if (!out.includes(k)) out.push(k);
  return out;
}

export function visibleSections(layout?: Layout | null): SectionKey[] {
  const hidden = new Set(layout?.hidden ?? []);
  return orderedSections(layout).filter((k) => !hidden.has(k));
}
