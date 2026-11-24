/** Breakpoint matrix for the responsive audit (portrait + landscape where it applies). */
export const VIEWPORTS = [
  { name: "360p", width: 360, height: 780, touch: true }, { name: "360l", width: 780, height: 360, touch: true },
  { name: "390p", width: 390, height: 844, touch: true }, { name: "390l", width: 844, height: 390, touch: true },
  { name: "414p", width: 414, height: 896, touch: true }, { name: "414l", width: 896, height: 414, touch: true },
  { name: "768p", width: 768, height: 1024, touch: true }, { name: "768l", width: 1024, height: 768, touch: true },
  { name: "1024p", width: 1024, height: 1366, touch: true }, { name: "1024l", width: 1366, height: 1024, touch: true },
  { name: "1280", width: 1280, height: 800, touch: false },
  { name: "1440", width: 1440, height: 900, touch: false },
  { name: "1920", width: 1920, height: 1080, touch: false },
] as const;

export const PAGES = ["/", "/work", "/selected-work", "/services", "/process", "/about", "/clients", "/before-after", "/toolkit", "/faq", "/contact", "/work/ai"] as const;
