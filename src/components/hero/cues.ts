/**
 * hero_cues: the cue sheet for the hero film (see docs/hero-film/hero-cues.json).
 * Zones are fractions (0..1) of the film frame: { x, y, w, h }. Times are seconds into the intro or into each loop pass.
 * The older, simpler shape ({ headlineDockAt, cards, loopCards, zones.gallery {left,right,top,bottom} in %}) is still accepted.
 */
export type Rect = { x: number; y: number; w: number; h: number };
export type HeadState = "hidden" | "large-left" | "fade-out" | "docked" | "top" | "docked-top";
export type HeadCue = { at: number; state: HeadState };
export type Cue = { at: number; slot: number };
export type Cut = { at: number; type: string };
export type Flash = { at: number; type: "impact" | "burst" | string };
/** shift = fraction of the gallery width to slide the cards (negative = left); scale = card scale while it lasts. */
export type Intrusion = { from: number; to: number; side: "left" | "right"; shift: number; scale: number };

export type HeroCues = {
  zones: { nav: Rect; headline: Rect; gallery: Rect; leftLane: Rect; rightLane: Rect; floor: Rect };
  durations: { intro: number | null; loop: number | null };
  intro: { headline: HeadCue[]; cards: Cue[]; flashes: Flash[] };
  loop: { headline: HeadCue[]; cuts: Cut[]; intrusions: Intrusion[]; cards: Cue[]; holdAfterCut: number };
  mobile: { gallery: Rect; headline: HeadCue[]; cardEvery: number; cardStart: number };
  /** false when nothing was supplied: the player then picks timings from the video lengths */
  authored: boolean;
};

export const DEFAULT_ZONES: HeroCues["zones"] = {
  nav: { x: 0, y: 0, w: 1, h: 0.1 },
  headline: { x: 0.03, y: 0.11, w: 0.37, h: 0.07 },
  gallery: { x: 0.27, y: 0.2, w: 0.46, h: 0.42 },
  leftLane: { x: 0, y: 0.2, w: 0.25, h: 0.44 },
  rightLane: { x: 0.75, y: 0.2, w: 0.25, h: 0.44 },
  floor: { x: 0, y: 0.64, w: 1, h: 0.36 },
};
export const DEFAULT_MOBILE_GALLERY: Rect = { x: 0.06, y: 0.14, w: 0.88, h: 0.3 };
const STATES: HeadState[] = ["hidden", "large-left", "fade-out", "docked", "top", "docked-top"];

type O = Record<string, unknown>;
const obj = (v: unknown): O => (v && typeof v === "object" && !Array.isArray(v) ? (v as O) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const byAt = <T extends { at: number }>(a: T, b: T) => a.at - b.at;

function rect(v: unknown, d: Rect): Rect {
  const o = obj(v);
  // old shape: percentages { left, right, top, bottom }
  if ("left" in o && "right" in o) {
    const l = num(o.left, NaN) / 100, r = num(o.right, NaN) / 100, t = num(o.top, NaN) / 100, b = num(o.bottom, NaN) / 100;
    return [l, r, t, b].every(Number.isFinite) && r > l && b > t ? { x: l, y: t, w: r - l, h: b - t } : d;
  }
  const r = { x: num(o.x, d.x), y: num(o.y, d.y), w: num(o.w, d.w), h: num(o.h, d.h) };
  return r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0 && r.x + r.w <= 1.001 && r.y + r.h <= 1.001 ? r : d;
}
const cues = (v: unknown): Cue[] => arr(v)
  .map((c) => ({ at: num(obj(c).at, NaN), slot: Math.max(1, Math.round(num(obj(c).slot, 1))) }))
  .filter((c) => Number.isFinite(c.at) && c.at >= 0).sort(byAt);
const heads = (v: unknown): HeadCue[] => arr(v)
  .map((c) => ({ at: num(obj(c).at, NaN), state: obj(c).state as HeadState }))
  .filter((c) => Number.isFinite(c.at) && STATES.includes(c.state)).sort(byAt);
const timed = (v: unknown): { at: number; type: string }[] => arr(v)
  .map((c) => ({ at: num(obj(c).at, NaN), type: String(obj(c).type ?? "") }))
  .filter((c) => Number.isFinite(c.at)).sort(byAt);

/** Reads "slide the cards ~6% left and shrink 4%" style notes when no numbers are given. */
function intrusions(v: unknown): Intrusion[] {
  return arr(v).map((c) => {
    const o = obj(c); const note = String(o.note ?? "");
    const side = o.side === "left" ? "left" : "right";
    const m = note.match(/(\d+(?:\.\d+)?)\s*%\s*(left|right)/i);
    const shiftPct = m ? Number(m[1]) * (m[2].toLowerCase() === "left" ? -1 : 1) : side === "right" ? -5 : 5;
    const s = note.match(/shrink\D{0,6}(\d+(?:\.\d+)?)\s*%/i);
    return {
      from: num(o.from, NaN), to: num(o.to, NaN), side,
      shift: num(o.shift, shiftPct / 100), scale: num(o.scale, s ? 1 - Number(s[1]) / 100 : 1),
    } as Intrusion;
  }).filter((i) => Number.isFinite(i.from) && Number.isFinite(i.to) && i.to > i.from).sort((a, b) => a.from - b.from);
}

export function parseCues(raw: unknown): HeroCues {
  const o = obj(raw), z = obj(o.zones), intro = obj(o.intro), loop = obj(o.loop), mob = obj(o.mobile), dur = obj(o.durations);
  const old = typeof o.headlineDockAt === "number" || Array.isArray(o.loopCards) || Array.isArray(o.cards);
  const rules = String(loop.cardRules ?? "");
  const hold = rules.match(/(\d+(?:\.\d+)?)\s*s after a cut/i);
  const mobCards = mob.cards;
  const every = typeof mobCards === "string" ? mobCards.match(/every\s*(\d+(?:\.\d+)?)\s*s/i) : null;
  const start = typeof mobCards === "string" ? mobCards.match(/starting\s*(\d+(?:\.\d+)?)\s*s/i) : null;
  const res: HeroCues = {
    zones: {
      nav: rect(z.nav, DEFAULT_ZONES.nav), headline: rect(z.headline, DEFAULT_ZONES.headline), gallery: rect(z.gallery, DEFAULT_ZONES.gallery),
      leftLane: rect(z.leftLane, DEFAULT_ZONES.leftLane), rightLane: rect(z.rightLane, DEFAULT_ZONES.rightLane), floor: rect(z.floor, DEFAULT_ZONES.floor),
    },
    durations: { intro: typeof dur.intro === "number" ? dur.intro : null, loop: typeof dur.loop === "number" ? dur.loop : null },
    intro: { headline: heads(intro.headline), cards: cues(intro.cards), flashes: timed(intro.flashes) },
    loop: { headline: heads(loop.headline), cuts: timed(loop.cuts), intrusions: intrusions(loop.intrusions), cards: cues(loop.cards), holdAfterCut: hold ? Number(hold[1]) : 0.4 },
    mobile: {
      gallery: rect(mob.gallery ?? z.galleryMobile, DEFAULT_MOBILE_GALLERY), headline: heads(mob.headline),
      cardEvery: num(obj(mobCards).every, every ? Number(every[1]) : 3), cardStart: num(obj(mobCards).start, start ? Number(start[1]) : 0.8),
    },
    authored: false,
  };
  if (old) {
    const dockAt = num(o.headlineDockAt, NaN);
    if (Number.isFinite(dockAt)) res.intro.headline = [{ at: 0, state: "large-left" }, { at: dockAt, state: "docked" }];
    res.intro.cards = cues(o.cards);
    res.loop.cards = cues(o.loopCards);
  }
  res.authored = res.intro.headline.length + res.loop.cards.length + res.intro.cards.length > 0;
  return res;
}

/** Fills gaps when no cue sheet exists yet: headline large early, docked at 85% of the intro, a card every 3 s in the loop. */
export function withFallbacks(c: HeroCues, introDur: number, loopDur: number): HeroCues {
  const out = { ...c, intro: { ...c.intro }, loop: { ...c.loop }, mobile: { ...c.mobile } };
  if (!out.intro.headline.length) out.intro.headline = [{ at: 0.6, state: "large-left" }, { at: Math.max(1, introDur * 0.85), state: "docked" }];
  if (!out.loop.headline.length) out.loop.headline = [{ at: 0, state: "docked" }];
  if (!out.mobile.headline.length) {
    out.mobile.headline = out.intro.headline.map((h) => ({ ...h, state: h.state === "large-left" ? "top" : h.state === "docked" ? "docked-top" : h.state }));
  }
  if (!out.loop.cards.length && loopDur > 0) {
    out.loop.cards = Array.from({ length: Math.max(1, Math.floor((loopDur - 0.8) / 3) + 1) }, (_, i) => ({ at: 0.8 + i * 3, slot: (i % 3) + 1 }));
  }
  return out;
}

/**
 * cardRules: a card never flies in through a cut's sparkle. A cue whose flight would overlap a cut
 * (it lands about `flight` seconds after its cue) is held until `hold` seconds after that cut.
 */
export function holdForCuts(cards: Cue[], cuts: Cut[], hold = 0.4, flight = 0.9): Cue[] {
  return cards.map((c) => {
    const cut = cuts.find((k) => c.at > k.at - flight && c.at < k.at + hold);
    return cut ? { ...c, at: +(cut.at + hold).toFixed(3) } : c;
  }).sort(byAt);
}

/** The headline state at time t (the last cue at or before t). */
export function headAt(list: HeadCue[], t: number, initial: HeadState): HeadState {
  let s = initial;
  for (const h of list) if (h.at <= t) s = h.state; else break;
  return s;
}

/** Intrusion offset at loop time t, eased in over `lead` seconds before it starts and out after it ends. */
export function intrusionAt(list: Intrusion[], t: number, lead = 0.45): { shift: number; scale: number } {
  for (const i of list) {
    if (t >= i.from - lead && t <= i.to + lead) {
      const k = t < i.from ? (t - (i.from - lead)) / lead : t > i.to ? 1 - (t - i.to) / lead : 1;
      const e = k * k * (3 - 2 * k);
      return { shift: i.shift * e, scale: 1 + (i.scale - 1) * e };
    }
  }
  return { shift: 0, scale: 1 };
}
