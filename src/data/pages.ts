/** Standalone pages, one per home section (plus the discipline pages that already exist). */
export const PAGES = [
  { path: "/work", label: "Work", eyebrow: "Portfolio", title: "Work", intro: "Every published film, AI Video and Video Editing, in one place.", media: "library", header: true },
  { path: "/selected-work", label: "Selected", eyebrow: "Premium samples", title: "Selected work", intro: "The pieces I'd show first, each with the brief, my role and the result.", media: "premium-intro", header: true },
  { path: "/services", label: "Services", eyebrow: "Ways to work together", title: "Services", intro: "Clear offers, clear turnaround. Pick one, or ask for a mix.", media: "service-ai-ad", header: true },
  { path: "/process", label: "Process", eyebrow: "How it works", title: "Process", intro: "From brief to final cut, in five passes.", media: "process", header: true },
  { path: "/about", label: "About", eyebrow: "Xperience", title: "About", intro: "AI gives me a thousand shots. Editing decides which twelve matter.", media: "manifesto", header: true },
  { path: "/clients", label: "Clients", eyebrow: "Proof", title: "Clients", intro: "Clients don't hire a tool. They hire a result.", media: "proof", header: true },
  { path: "/before-after", label: "Before / After", eyebrow: "Raw in, finished out", title: "Before / After", intro: "What happens between the first output and the final frame.", media: "crafts-editing", header: false },
  { path: "/toolkit", label: "Toolkit", eyebrow: "The kit", title: "Toolkit", intro: "Generative models for the impossible shots, industry tools for the finish.", media: "toolkit", header: false },
  { path: "/faq", label: "FAQ", eyebrow: "Questions", title: "FAQ", intro: "Ownership, timing, revisions and how to start.", media: "finale", header: false },
  { path: "/contact", label: "Contact", eyebrow: "Start a project", title: "Contact", intro: "Have footage? Have an idea? Let's make the cut.", media: "finale", header: false },
] as const;

export type PagePath = (typeof PAGES)[number]["path"];
export const pageByPath = (p: string) => PAGES.find((x) => x.path === p);
