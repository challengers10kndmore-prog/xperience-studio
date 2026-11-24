/**
 * hero_cues: the cue sheet for the hero film.
 * {
 *   "zones": { "gallery": {"left":27,"right":73,"top":20,"bottom":62}, "galleryMobile": {...}, "dock": {"left":4,"top":11},
 *              "nav": 10, "lane": 25, "floor": 36 },
 *   "headlineDockAt": 15.5,                 // seconds into hero_intro
 *   "cards": [{"at": 16.2, "slot": 1}],     // intro times; slot = position in the Featured list (1-based)
 *   "loopCards": [{"at": 2.0, "slot": 1}]   // times inside each loop pass
 * }
 * Zone numbers are percentages of the hero (desktop 16:9 frame). Anything missing falls back to the defaults below.
 */
export type Zone = { left: number; right: number; top: number; bottom: number };
export type Cue = { at: number; slot: number };
export type HeroCues = {
  zones: { gallery: Zone; galleryMobile: Zone; dock: { left: number; top: number }; nav: number; lane: number; floor: number };
  headlineDockAt: number | null;
  cards: Cue[];
  loopCards: Cue[];
};

export const DEFAULT_ZONES: HeroCues["zones"] = {
  gallery: { left: 27, right: 73, top: 20, bottom: 62 },
  galleryMobile: { left: 6, right: 94, top: 13, bottom: 42 },
  dock: { left: 4, top: 11 },
  nav: 10,    // top % reserved for the nav
  lane: 25,   // left/right lanes: outer % each side
  floor: 36,  // floor lane: bottom %
};

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const zone = (z: unknown, d: Zone): Zone => {
  const o = (z && typeof z === "object" ? z : {}) as Partial<Zone>;
  const r = { left: num(o.left, d.left), right: num(o.right, d.right), top: num(o.top, d.top), bottom: num(o.bottom, d.bottom) };
  return r.right > r.left && r.bottom > r.top ? r : d;
};
const cueList = (v: unknown): Cue[] => (Array.isArray(v) ? v : [])
  .map((c) => ({ at: num((c as Cue)?.at, NaN), slot: Math.max(1, Math.round(num((c as Cue)?.slot, 1))) }))
  .filter((c) => Number.isFinite(c.at) && c.at >= 0)
  .sort((a, b) => a.at - b.at);

export function parseCues(raw: unknown): HeroCues {
  const o = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const z = (o.zones && typeof o.zones === "object" ? o.zones : {}) as Record<string, unknown>;
  const dock = (z.dock && typeof z.dock === "object" ? z.dock : {}) as Record<string, unknown>;
  return {
    zones: {
      gallery: zone(z.gallery, DEFAULT_ZONES.gallery),
      galleryMobile: zone(z.galleryMobile, DEFAULT_ZONES.galleryMobile),
      dock: { left: num(dock.left, DEFAULT_ZONES.dock.left), top: num(dock.top, DEFAULT_ZONES.dock.top) },
      nav: num(z.nav, DEFAULT_ZONES.nav), lane: num(z.lane, DEFAULT_ZONES.lane), floor: num(z.floor, DEFAULT_ZONES.floor),
    },
    headlineDockAt: typeof o.headlineDockAt === "number" ? o.headlineDockAt : null,
    cards: cueList(o.cards),
    loopCards: cueList(o.loopCards),
  };
}

/** Fills gaps when no cue sheet exists yet: dock at 70% of the intro, a card every 2.5 s after, loop cards every 3 s. */
export function withFallbacks(c: HeroCues, introDur: number, loopDur: number, slots: number): HeroCues {
  const dockAt = c.headlineDockAt ?? (introDur > 0 ? Math.max(0.5, introDur * 0.7) : 0);
  const cards = c.cards.length ? c.cards : introDur > 0
    ? Array.from({ length: Math.min(slots, 3) }, (_, i) => ({ at: Math.min(introDur - 0.2, dockAt + 0.4 + i * 1.2), slot: i + 1 }))
    : [];
  const loopCards = c.loopCards.length ? c.loopCards : loopDur > 0
    ? Array.from({ length: Math.min(slots, Math.max(1, Math.floor(loopDur / 3))) }, (_, i) => ({ at: 0.4 + i * 3, slot: ((i + 3) % Math.max(1, slots)) + 1 }))
    : [];
  return { ...c, headlineDockAt: dockAt, cards, loopCards };
}
