import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSiteData } from "@/data/DataProvider";
import { artFor, featuredOf, siteProjects, type SiteProject } from "@/data/placeholders";
import type { SectionMedia } from "@/data/types";
import { useMediaQuery } from "@/hooks/useInView";
import { isPlayableUrl, mediaUrl } from "@/lib/media";
import { displayTitle } from "@/lib/titles";
import { isLite } from "@/lib/perf";
import { reducedMotion } from "@/motion/useReducedMotion";
import { gsap } from "@/motion/gsap";
import { scrollToTarget } from "@/motion/SmoothScroll";
import { Magnetic } from "@/motion/Magnetic";
import { RollText } from "@/components/kinetic/RollText";
import { NavMark } from "@/components/brand/NavMark";
import { headAt, holdForCuts, intrusionAt, parseCues, withFallbacks, type HeadState, type Rect as ZRect } from "./cues";

/**
 * Hero film player, driven by the cue sheet in site_settings.hero_cues (docs/hero-film/hero-cues.json).
 * - hero-intro plays once per session; at its last frame the loop takes over with no crossfade (the frames match).
 * - Headline states on cue: large in the empty left of the frame, fade-out, then docked top-left (phones: top / docked-top).
 * - Intro flashes: a 120 ms chrome shake on the lightning strike, a bloom on the coin burst.
 * - Loop: featured films fly into three fixed slots inside the gallery zone on their cues (the next featured film each time),
 *   never through a cut's sparkle (held until 0.4 s after it), and slide aside while the character reaches into the gallery.
 * - Phones: vertical intro, then the phone idle loop; one card at a time in the upper middle, a new one every 3 s.
 * Add ?zones=1 to the address to see the zones drawn over the film.
 */

const SEEN_KEY = "xp:hero-intro-seen";
const seen = () => { try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ } };

const pick = (m: SectionMedia | undefined, mobile: boolean) => (m?.published ? (mobile ? m.mobile_url || null : m.desktop_url || null) : null);

/** True once both film slots have a desktop video (the switch from the assembly hero to the film hero). */
export function hasHeroFilm(sm: Record<string, SectionMedia>) {
  return !!(pick(sm["hero-intro"], false) && pick(sm["hero-loop"], false));
}

type Rect = { x: number; y: number; w: number; h: number };
/** Where the film actually sits on screen (object-cover crops it), so zones line up with the picture. */
function coverRect(W: number, H: number, vw: number, vh: number): Rect {
  const s = Math.max(W / vw, H / vh); const w = vw * s, h = vh * s;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}
const clampRect = (r: Rect, W: number, H: number, pad: number): Rect => {
  const x = Math.max(pad, r.x), y = Math.max(0, r.y);
  return { x, y, w: Math.max(0, Math.min(W - pad, r.x + r.w) - x), h: Math.max(0, Math.min(H, r.y + r.h) - y) };
};
const zoneRect = (z: ZRect, f: Rect): Rect => ({ x: f.x + z.x * f.w, y: f.y + z.y * f.h, w: z.w * f.w, h: z.h * f.h });

type CardItem = { key: number; p: SiteProject; slot: number; leaving?: boolean };

function FilmCard({ item, active, onOpen }: { item: CardItem; active: boolean; onOpen: (p: SiteProject, el: HTMLElement) => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const p = item.p;
  const src = reducedMotion() ? null : isPlayableUrl(p.teaser_url) ? p.teaser_url : isPlayableUrl(p.video_url) ? p.video_url : null;
  const poster = mediaUrl(p.cover_url || p.poster_url);
  useEffect(() => {
    const el = v.current; if (!el) return;
    if (active && !reducedMotion()) el.play().catch(() => {}); else el.pause();
  }, [active]);
  return (
    <button type="button" data-card={item.key} aria-label={`Play ${displayTitle(p.title)}`} data-cursor="play"
      onClick={(e) => onOpen(p, e.currentTarget)}
      className="chrome-card group absolute left-0 top-0 overflow-hidden text-left [backface-visibility:hidden] [will-change:transform]"
      style={{ width: "var(--cw)", height: "var(--ch)", background: artFor(p.id, p.discipline) }}>
      {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      {src && <video ref={v} src={mediaUrl(src)} muted loop playsInline preload="none" poster={poster} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`} />}
      <span className="absolute inset-0 bg-gradient-to-t from-void/85 via-void/10 to-transparent" />
      <span data-sweep className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent mix-blend-overlay opacity-0" />
      <span className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2">
        <span className="truncate font-display text-[clamp(0.8rem,0.6rem+0.5vw,1.05rem)] font-semibold leading-tight">{displayTitle(p.title)}</span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-chrome/90 text-void transition-transform group-hover:scale-110" aria-hidden>
          <svg viewBox="0 0 10 10" className="ml-0.5 size-2.5"><path d="M2 1l7 4-7 4z" fill="currentColor" /></svg>
        </span>
      </span>
      {p.placeholder && <span className="absolute left-2 top-2 rounded bg-void/70 px-1.5 py-0.5 font-label text-[0.5rem] tracking-[0.2em] text-ash">PLACEHOLDER</span>}
    </button>
  );
}

type Layout = "large" | "dock";
const layoutOf = (s: HeadState): Layout | null => (s === "large-left" || s === "top" ? "large" : s === "docked" || s === "docked-top" ? "dock" : null);

/** Fixed slots inside the gallery (fractions of the zone). Slot 2 floats in front; 1 and 3 sit back and turn inward. */
const SLOTS_DESKTOP = [
  { fx: 0.25, fy: 0.42, z: -150, ry: 20, rx: 4, o: 0.92 },
  { fx: 0.5, fy: 0.58, z: 0, ry: 0, rx: 3, o: 1 },
  { fx: 0.75, fy: 0.42, z: -150, ry: -20, rx: 4, o: 0.92 },
];
const SLOT_MOBILE = { fx: 0.5, fy: 0.5, z: 0, ry: -6, rx: 4, o: 1 };

export function HeroFilm({ onOpen }: { onOpen: (p: SiteProject, el: HTMLElement) => void }) {
  const data = useSiteData();
  const { settings, sectionMedia: sm } = data;
  const mobile = useMediaQuery("(max-aspect-ratio: 4/5)");
  const reduced = useMemo(() => reducedMotion(), []);
  const lite = useMemo(() => isLite(), []);
  const debug = useMemo(() => typeof location !== "undefined" && new URLSearchParams(location.search).has("zones"), []);

  const intro = sm["hero-intro"], loop = sm["hero-loop"], idle = sm["hero-idle"];
  const introSrc = pick(intro, mobile) || pick(intro, false);
  const loopSrc = mobile ? pick(loop, true) || pick(idle, true) || pick(idle, false) || pick(loop, false) : pick(loop, false);
  const loopPoster = mediaUrl(mobile ? (pick(loop, true) ? loop?.poster_url : idle?.poster_url) || loop?.poster_url : loop?.poster_url);
  const introPoster = mediaUrl(intro?.poster_url);

  // "cycle through all featured" (topped up with the rest when fewer than three are featured)
  const films = useMemo(() => { const all = siteProjects(data.projects); const f = featuredOf(all); return f.length >= 3 ? f : [...f, ...all.filter((p) => !f.includes(p))]; }, [data.projects]);
  const baseCues = useMemo(() => parseCues(settings.hero_cues), [settings.hero_cues]);
  const nSlots = mobile ? 1 : 3;

  const root = useRef<HTMLElement>(null);
  const introV = useRef<HTMLVideoElement>(null);
  const loopV = useRef<HTMLVideoElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<() => void>(() => {});

  const [startInLoop] = useState(() => reduced || seen() || !introSrc); // decided once: the intro must stay mounted under the loop after the switch
  const [phase, setPhase] = useState<"wait" | "intro" | "loop">(startInLoop ? "loop" : "wait");
  const [introGone, setIntroGone] = useState(startInLoop);
  const [skipped, setSkipped] = useState(false);
  const [head, setHead] = useState<HeadState>(startInLoop ? (mobile ? "docked-top" : "docked") : "hidden");
  const [layout, setLayout] = useState<Layout>(startInLoop ? "dock" : "large");
  const [skipVisible, setSkipVisible] = useState(false);
  const [cards, setCards] = useState<CardItem[]>(() => (reduced ? films.slice(0, nSlots).map((p, i) => ({ key: i, p, slot: i + 1 })) : []));
  const [box, setBox] = useState<{ W: number; H: number; frame: Rect }>({ W: 1440, H: 810, frame: { x: 0, y: 0, w: 1440, h: 810 } });
  const keyRef = useRef(100);
  const nextFilm = useRef(reduced ? nSlots : 0);
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const headStateRef = useRef(head);

  // ---- measure: viewport + where the film frame sits
  useEffect(() => {
    const measure = () => {
      const r = root.current!.getBoundingClientRect();
      const v = loopV.current ?? introV.current;
      const vw = v?.videoWidth || (mobile ? 1080 : 1920), vh = v?.videoHeight || (mobile ? 1920 : 1080);
      setBox({ W: r.width, H: r.height, frame: coverRect(r.width, r.height, vw, vh) });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(root.current!);
    const vids = [introV.current, loopV.current].filter(Boolean) as HTMLVideoElement[];
    vids.forEach((v) => v.addEventListener("loadedmetadata", measure));
    return () => { ro.disconnect(); vids.forEach((v) => v.removeEventListener("loadedmetadata", measure)); };
  }, [mobile]);

  // ---- layout numbers
  const Z = baseCues.zones;
  const f = box.frame;
  const gutter = Math.max(16, Math.min(56, box.W * 0.04));
  const navBottom = Math.max(mobile ? 64 : 72, f.y + (Z.nav.y + Z.nav.h) * f.h);
  const zone = useMemo(() => clampRect(zoneRect(mobile ? baseCues.mobile.gallery : Z.gallery, f), box.W, box.H, 8), [mobile, baseCues, Z.gallery, f, box.W, box.H]);
  const zoneW = useRef(zone.w); zoneW.current = zone.w;
  const cw = mobile ? Math.min(zone.w * 0.8, zone.h * 0.86 * (16 / 9)) : Math.min(zone.w * 0.44, zone.h * 0.62 * (16 / 9));
  const ch = cw * (9 / 16);
  const headBox: React.CSSProperties = useMemo(() => {
    if (mobile) {
      return layout === "large"
        ? { left: gutter, right: gutter, top: navBottom + 12 }
        : { left: gutter, right: gutter, top: navBottom + 4, height: Math.max(36, zone.y - navBottom - 10) };
    }
    if (layout === "large") {
      const left = Math.max(gutter, f.x + 0.03 * f.w);
      return { left, width: Math.max(220, f.x + 0.35 * f.w - left), top: f.y + 0.45 * f.h, translate: "0 -50%" };
    }
    const r = zoneRect(Z.headline, f);
    return { left: Math.max(gutter, r.x), top: Math.max(navBottom + 4, r.y), width: Math.min(r.w, box.W - gutter * 2), height: r.h };
  }, [mobile, layout, gutter, navBottom, zone.y, f, Z.headline, box.W]);

  // ---- fit the headline: large = multi-line, the longest word fits; docked = one line inside zones.headline
  useLayoutEffect(() => {
    const wrap = headRef.current, h1 = wrap?.querySelector("h1"); if (!wrap || !h1) return;
    h1.style.fontSize = "100px";
    const words = Array.from(h1.querySelectorAll<HTMLElement>("[data-w]"));
    const W = wrap.clientWidth || 1;
    let fs: number;
    if (layout === "large") {
      const longest = Math.max(1, ...words.map((w) => w.offsetWidth));
      fs = Math.min((100 * W) / longest * 0.97, mobile ? box.W * 0.12 : f.h * 0.095, mobile ? 56 : 140);
      h1.style.whiteSpace = "normal";
    } else {
      h1.style.whiteSpace = "nowrap";
      const one = (100 * W) / Math.max(1, h1.scrollWidth) * 0.98;
      const H = wrap.clientHeight || 60;
      fs = Math.min(one, (H * 0.9) / 0.95);
      if (mobile && fs < 16) { h1.style.whiteSpace = "normal"; fs = Math.min(20, (H * 0.9) / 1.9); } // two lines on very narrow phones
    }
    h1.style.fontSize = `${Math.max(14, fs).toFixed(1)}px`;
  }, [layout, headBox, settings.hero_headline, mobile, box.W, f.h]);

  // ---- headline motion between states
  const animIn = useCallback((dock: boolean) => {
    const el = headRef.current; if (!el) return;
    const words = el.querySelectorAll("[data-w]");
    if (reduced) { gsap.set(words, { opacity: 1, clearProps: "transform,filter" }); return; }
    gsap.killTweensOf(words);
    gsap.fromTo(words, { opacity: 0, yPercent: 70, rotationX: -88, z: dock ? -260 : 0, filter: "blur(10px)", transformOrigin: "50% 100%" },
      { opacity: 1, yPercent: 0, rotationX: 0, z: 0, filter: "blur(0px)", stagger: dock ? 0.035 : 0.06, duration: dock ? 1 : 1.3, ease: "expo" });
    const sw = el.querySelector("[data-hsweep]");
    if (sw && !lite) gsap.fromTo(sw, { xPercent: -120, opacity: 1 }, { xPercent: 220, opacity: 0, duration: 1.4, delay: 0.35, ease: "power2.inOut" });
  }, [reduced, lite]);
  const animOut = useCallback((fast: boolean, done?: () => void) => {
    const words = headRef.current?.querySelectorAll("[data-w]"); if (!words) return done?.();
    if (reduced) { gsap.set(words, { opacity: 0 }); return done?.(); }
    gsap.killTweensOf(words);
    gsap.to(words, { opacity: 0, yPercent: -45, rotationX: 70, z: -200, filter: "blur(10px)", stagger: fast ? 0.015 : 0.035, duration: fast ? 0.35 : 0.8, ease: "power2.in", onComplete: done });
  }, [reduced]);
  const visible = useRef(false);
  const pendingIn = useRef(false);
  useLayoutEffect(() => { // initial: hidden words until the first cue (or docked from the start)
    const words = headRef.current?.querySelectorAll("[data-w]");
    if (!words) return;
    if (startInLoop) { visible.current = true; if (!reduced) { pendingIn.current = true; } } else gsap.set(words, { opacity: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.hero_headline]);
  useEffect(() => {
    headStateRef.current = head;
    const target = layoutOf(head);
    const rest = restRef.current;
    const showRest = head === "docked" || head === "docked-top";
    if (rest) {
      if (reduced) gsap.set(rest, { autoAlpha: showRest ? 1 : 0, y: 0 });
      else gsap.to(rest, showRest ? { autoAlpha: 1, y: 0, duration: 1, delay: 0.6, ease: "expo" } : { autoAlpha: 0, y: 20, duration: 0.4 });
    }
    if (!target) { if (visible.current) animOut(false); visible.current = false; return; }
    if (target !== layout) {
      const go = () => { pendingIn.current = true; setLayout(target); };
      if (visible.current) animOut(true, go); else go();
      visible.current = true;
      return;
    }
    if (!visible.current || pendingIn.current) { pendingIn.current = false; visible.current = true; animIn(target === "dock"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head]);
  useLayoutEffect(() => { // after a layout switch has rendered (and the font is fitted), bring the words in
    if (!pendingIn.current) return;
    pendingIn.current = false;
    animIn(layout === "dock");
  }, [layout, animIn]);

  // ---- cards: each cue brings the NEXT featured film into that slot
  const addCard = useCallback((slot: number) => {
    if (!films.length) return;
    const s = Math.min(Math.max(1, slot), nSlots);
    setCards((cs) => {
      const others = cs.filter((c) => !c.leaving && c.slot !== s).map((c) => c.p.id);
      let p = films[nextFilm.current++ % films.length];
      for (let k = 0; k < films.length && others.includes(p.id) && films.length > others.length; k++) p = films[nextFilm.current++ % films.length];
      return [...cs.map((c) => (c.slot === s && !c.leaving ? { ...c, leaving: true } : c)), { key: keyRef.current++, p, slot: s }];
    });
  }, [films, nSlots]);

  const sparkle = useCallback(() => {
    const st = stageRef.current; if (!st || lite) return;
    st.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
      gsap.fromTo(el, { filter: "brightness(1.7) saturate(1.3)" }, { filter: "brightness(1) saturate(1)", duration: 0.7, ease: "power2.out", clearProps: "filter" });
      const sw = el.querySelector("[data-sweep]");
      if (sw) gsap.fromTo(sw, { xPercent: 0, opacity: 1 }, { xPercent: 420, opacity: 0, duration: 0.8, ease: "power2.out" });
    });
  }, [lite]);
  const shake = useCallback(() => {
    const els = [document.querySelector("header"), headRef.current, restRef.current, root.current?.querySelector("[data-zone]")].filter(Boolean) as HTMLElement[];
    // the CSS `translate` property, so it never fights the transforms GSAP owns
    els.forEach((el) => el.animate([{ translate: "0 0" }, { translate: "-7px 2px" }, { translate: "6px -2px" }, { translate: "-4px 1px" }, { translate: "2px 0" }, { translate: "0 0" }], { duration: 120, easing: "linear" }));
  }, []);
  const bloom = useCallback(() => {
    const b = bloomRef.current; if (!b) return;
    gsap.timeline().fromTo(b, { opacity: 0, scale: 0.6 }, { opacity: 0.7, scale: 1, duration: 0.14, ease: "power2.out" }).to(b, { opacity: 0, scale: 1.25, duration: 0.8, ease: "power2.out" });
  }, []);

  // ---- playback + cue clock
  useEffect(() => {
    if (reduced) return;
    const iv = introV.current, lv = loopV.current;
    let raf = 0, prevT = -1, lastPhase = phaseRef.current, alive = true, passes = 0, mobileShown = -1;
    let lastShift = 0, lastScale = 1;
    const xTo = shiftRef.current ? gsap.quickTo(shiftRef.current, "x", { duration: 0.5, ease: "power2.out" }) : null;
    const sxTo = shiftRef.current ? gsap.quickTo(shiftRef.current, "scaleX", { duration: 0.5, ease: "power2.out" }) : null;
    const syTo = shiftRef.current ? gsap.quickTo(shiftRef.current, "scaleY", { duration: 0.5, ease: "power2.out" }) : null;
    const sTo = (v: number) => { sxTo?.(v); syTo?.(v); };
    const C = () => withFallbacks(baseCues, iv?.duration || baseCues.durations.intro || 0, lv?.duration || baseCues.durations.loop || 0);
    let loopCards = holdForCuts(C().loop.cards, C().loop.cuts, C().loop.holdAfterCut);

    const toLoop = (viaSkip = false) => {
      if (!alive || phaseRef.current === "loop") return;
      markSeen(); setSkipVisible(false); if (viaSkip) setSkipped(true);
      if (lv) {
        lv.currentTime = 0;
        // hide the intro only once the loop is actually painting, so the shared frame never blinks
        const hide = () => setIntroGone(true);
        lv.addEventListener("playing", hide, { once: true });
        window.setTimeout(hide, viaSkip ? 50 : 700);
        lv.play().catch(hide);
      } else setIntroGone(true);
      setPhase("loop"); phaseRef.current = "loop";
      if (viaSkip) iv?.pause();
    };
    const startIntro = () => {
      if (!alive || !iv) return toLoop();
      setPhase("intro"); phaseRef.current = "intro";
      iv.currentTime = 0;
      iv.play().catch(() => toLoop());
      window.setTimeout(() => alive && phaseRef.current === "intro" && setSkipVisible(true), 2000);
    };
    const onEnded = () => toLoop();
    const onErr = () => toLoop();
    iv?.addEventListener("ended", onEnded); iv?.addEventListener("error", onErr);
    skipRef.current = () => toLoop(true);
    lv?.addEventListener("loadedmetadata", () => { loopCards = holdForCuts(C().loop.cards, C().loop.cuts, C().loop.holdAfterCut); });

    if (phaseRef.current === "wait") {
      if (document.documentElement.classList.contains("is-loading")) window.addEventListener("xp:ignited", startIntro, { once: true });
      else startIntro();
    } else lv?.play().catch(() => {});

    const tick = () => {
      const ph = phaseRef.current;
      const v = ph === "intro" ? iv : ph === "loop" ? lv : null;
      if (v && v.readyState >= 1) {
        const c = C();
        const t = v.currentTime;
        if (ph !== lastPhase) { prevT = -1; lastPhase = ph; passes = 0; }
        if (ph === "loop" && t < prevT - 1) { prevT = -1; passes++; } // loop wrapped
        const crossed = (at: number) => at > prevT && at <= t;
        // headline
        const list = ph === "intro" ? (mobile ? c.mobile.headline : c.intro.headline) : mobile ? [{ at: 0, state: "docked-top" as const }] : c.loop.headline;
        const hs = headAt(list, t, ph === "intro" ? "hidden" : mobile ? "docked-top" : "docked");
        if (hs !== headStateRef.current) { headStateRef.current = hs; setHead(hs); }
        if (ph === "intro") {
          for (const fl of c.intro.flashes) if (crossed(fl.at)) { if (fl.type === "impact") shake(); else if (fl.type === "burst") bloom(); }
          if (!mobile) for (const cue of c.intro.cards) if (crossed(cue.at)) addCard(cue.slot);
        } else if (mobile) {
          // one card at a time, every 3 s, counted across loop passes (the phone loop is 6.92 s)
          const el = passes * (lv?.duration || 0) + t;
          const k = Math.floor((el - c.mobile.cardStart) / c.mobile.cardEvery);
          if (k >= 0 && k !== mobileShown) { mobileShown = k; addCard(1); }
        } else {
          for (const cut of c.loop.cuts) if (crossed(cut.at)) sparkle();
          for (const cue of loopCards) if (crossed(cue.at)) addCard(cue.slot);
          const { shift, scale } = intrusionAt(c.loop.intrusions, t);
          if (Math.abs(shift - lastShift) > 0.0005 || Math.abs(scale - lastScale) > 0.0005) { lastShift = shift; lastScale = scale; xTo?.(shift * zoneW.current); sTo(scale); }
        }
        prevT = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // pause everything while the hero is off-screen
    const io = new IntersectionObserver(([e]) => {
      const vid = phaseRef.current === "intro" ? iv : lv;
      if (!vid) return;
      if (e.isIntersecting) vid.play().catch(() => {}); else vid.pause();
    });
    io.observe(root.current!);
    return () => {
      alive = false; cancelAnimationFrame(raf); io.disconnect();
      iv?.removeEventListener("ended", onEnded); iv?.removeEventListener("error", onErr);
      window.removeEventListener("xp:ignited", startIntro);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introSrc, loopSrc, baseCues, reduced, mobile]);

  // ---- card choreography: fly in from depth into the slot, the slot's old film flies off
  const posFor = useCallback((slot: number, newest: boolean) => {
    const q = mobile ? SLOT_MOBILE : SLOTS_DESKTOP[Math.min(Math.max(slot, 1), 3) - 1];
    return { x: zone.w * q.fx - cw / 2, y: zone.h * q.fy - ch / 2, z: q.z + (newest && !mobile ? 70 : 0), rotationY: q.ry, rotationX: q.rx, opacity: q.o, scale: 1 };
  }, [zone, cw, ch, mobile]);
  const newestKey = cards.filter((c) => !c.leaving).reduce((m, c) => Math.max(m, c.key), -1);
  const seenKeys = useRef(new Set<number>());
  useLayoutEffect(() => {
    const stage = stageRef.current; if (!stage) return;
    for (const c of cards) {
      const el = stage.querySelector<HTMLElement>(`[data-card="${c.key}"]`); if (!el) continue;
      el.style.zIndex = String(c.leaving ? 1 : c.key === newestKey ? 30 : c.slot === 2 ? 20 : 10);
      if (c.leaving) {
        if (el.dataset.leaving) continue;
        el.dataset.leaving = "1";
        const dir = c.slot === 1 ? -1 : c.slot === 3 ? 1 : 0;
        gsap.to(el, { z: -700, x: `+=${dir * cw * 0.5}`, y: `-=${ch * 0.3}`, rotationY: dir * -40, opacity: 0, duration: 0.8, ease: "power3.in", overwrite: true,
          onComplete: () => setCards((cs) => cs.filter((x) => x.key !== c.key)) });
        continue;
      }
      const to = posFor(c.slot, c.key === newestKey);
      if (!seenKeys.current.has(c.key)) {
        seenKeys.current.add(c.key);
        if (reduced) { gsap.set(el, to); continue; }
        gsap.fromTo(el, { x: to.x, y: to.y + ch * 0.25, z: -1400, rotationY: -38, rotationX: 22, opacity: 0, scale: 0.9 },
          { ...to, duration: 1.3, ease: "expo", overwrite: true });
        const sw = el.querySelector("[data-sweep]");
        if (sw && !lite) gsap.fromTo(sw, { xPercent: 0, opacity: 0.9 }, { xPercent: 420, opacity: 0, duration: 1.3, ease: "power2.inOut", delay: 0.45 });
      } else {
        gsap.to(el, { ...to, duration: 1, ease: "expo", overwrite: "auto" });
      }
    }
  }, [cards, posFor, cw, ch, reduced, lite, newestKey]);

  // ---- cursor tilt on the floating arrangement + scroll-out depth
  useEffect(() => {
    const stage = stageRef.current; if (!stage || reduced) return;
    const ry = gsap.quickTo(stage, "rotationY", { duration: 0.9, ease: "power3" });
    const rx = gsap.quickTo(stage, "rotationX", { duration: 0.9, ease: "power3" });
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || lite) return;
      ry(((e.clientX / innerWidth) - 0.5) * 12); rx(-((e.clientY / innerHeight) - 0.5) * 10);
    };
    const onScroll = () => {
      const r = root.current!.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.8)));
      gsap.set(zoneRef.current, { z: s * 500, opacity: 1 - s * 1.1 });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("scroll", onScroll); };
  }, [reduced, lite]);

  const docked = head === "docked" || head === "docked-top";
  const floorTop = Math.min(box.H - 230, f.y + Z.floor.y * f.h);
  const dbg = (r: ZRect, label: string, cls: string) => {
    const q = zoneRect(r, f);
    return <div key={label} className={`absolute border border-dashed ${cls}`} style={{ left: q.x, top: q.y, width: q.w, height: q.h }}><span className="bg-black/70 px-1">{label}</span></div>;
  };

  return (
    <section ref={root} id="top" data-hero="film" data-head={head} data-phase={phase} className="relative isolate h-svh min-h-[560px] w-full overflow-hidden bg-void [perspective:1200px]" style={{ ["--cw" as string]: `${cw}px`, ["--ch" as string]: `${ch}px` }}>
      {/* video layer */}
      <div aria-hidden className="absolute inset-0 z-0">
        {reduced ? (
          <img src={loopPoster || introPoster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            {loopSrc && <video ref={loopV} src={mediaUrl(loopSrc)} poster={startInLoop ? loopPoster : undefined} muted loop playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" />}
            {introSrc && !startInLoop && (
              <video ref={introV} src={mediaUrl(introSrc)} poster={introPoster} muted playsInline preload="auto"
                className={`absolute inset-0 h-full w-full object-cover ${skipped ? "transition-opacity duration-500" : ""} ${introGone ? "opacity-0" : "opacity-100"}`} />
            )}
          </>
        )}
        <div className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-void/70 to-transparent" />
        <div className={`absolute inset-0 transition-opacity duration-1000 ${docked ? "opacity-100" : "opacity-0"} bg-[radial-gradient(60%_70%_at_0%_100%,rgba(7,6,13,.7),transparent_70%)] max-md:bg-[linear-gradient(0deg,rgba(7,6,13,.92)_0%,rgba(7,6,13,.4)_30%,rgba(7,6,13,0)_50%)]`} />
        <div className={`absolute inset-0 transition-opacity duration-700 ${head === "large-left" || head === "top" ? "opacity-100" : "opacity-0"} bg-[linear-gradient(90deg,rgba(7,6,13,.55)_0%,rgba(7,6,13,0)_38%)] max-md:bg-[linear-gradient(180deg,rgba(7,6,13,.6)_0%,rgba(7,6,13,0)_40%)]`} />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-void to-transparent" />
      </div>
      {/* coin-burst bloom */}
      <div ref={bloomRef} aria-hidden className="pointer-events-none absolute inset-0 z-10 opacity-0 mix-blend-screen bg-[radial-gradient(45%_45%_at_50%_45%,rgba(255,255,255,.9),rgba(200,75,255,.45)_35%,rgba(47,107,255,.15)_60%,transparent_75%)]" />

      {/* gallery zone: work samples only ever appear in here, always above the film */}
      <div ref={zoneRef} data-zone="gallery" data-offscreen-ok className="absolute z-20 [transform-style:preserve-3d]"
        style={{ left: zone.x, top: zone.y, width: zone.w, height: zone.h, perspective: 1400 }}>
        <div ref={shiftRef} data-shift className="relative h-full w-full [transform-style:preserve-3d]">
          <div ref={stageRef} className="relative h-full w-full [transform-style:preserve-3d]">
            {cards.map((c) => <FilmCard key={c.key} item={c} active={!reduced && c.key === newestKey} onOpen={onOpen} />)}
          </div>
        </div>
      </div>

      <>
        {/* headline: large in the empty left during the intro, fades for the coin flip, re-enters docked */}
        <div ref={headRef} data-layout={layout} className="absolute z-30 [perspective:900px]" style={headBox}>
          <h1 key={settings.hero_headline} className="relative font-semibold leading-[0.95] [text-shadow:0_4px_30px_rgba(7,6,13,.6)] [transform-style:preserve-3d]">
            {(settings.hero_headline ?? "").split(" ").map((w, i, arr) => (
              <span key={i} data-w className={`inline-block will-change-transform ${i === 1 && arr.length > 2 ? "text-gradient" : ""}`}>{w}{i < arr.length - 1 ? " " : ""}</span>
            )).flatMap((el, i, a) => (i < a.length - 1 ? [el, " "] : [el]))}
            <span data-hsweep aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 mix-blend-overlay" />
          </h1>
        </div>

        {/* the rest of the copy: floor lane (desktop) / bottom (phones) */}
        <div ref={restRef} className="absolute z-30 space-y-5 opacity-0"
          style={mobile ? { left: gutter, right: gutter, bottom: "calc(2rem + env(safe-area-inset-bottom))" } : { left: Math.max(gutter, f.x + 0.03 * f.w), top: floorTop, width: Math.min(box.W * 0.5, 640) }}>
          <p className="max-w-md text-[clamp(0.95rem,0.85rem+0.3vw,1.1rem)] text-chrome/80 max-md:line-clamp-2">{settings.hero_sub}</p>
          <div className="flex flex-wrap gap-3">
            <Magnetic><button type="button" onClick={() => scrollToTarget("#library")} className="btn btn-primary" data-cursor="play"><RollText>{settings.hero_cta_primary ?? "Watch the reel"}</RollText></button></Magnetic>
            <Magnetic><button type="button" onClick={() => scrollToTarget("#contact")} className="btn btn-ghost"><RollText>{settings.hero_cta_secondary ?? "Start a project"}</RollText></button></Magnetic>
          </div>
          <p className="hidden items-center gap-2.5 text-sm text-ash md:flex"><NavMark className="h-6 w-6" /> {settings.credit_line}</p>
        </div>
      </>

      {/* skip */}
      {phase === "intro" && (
        <button type="button" onClick={() => skipRef.current()}
          className={`safe-bottom absolute bottom-6 right-[var(--gutter)] z-40 flex min-h-11 items-center gap-2 rounded-full border border-line bg-void/60 px-5 font-label text-[0.65rem] tracking-[0.3em] text-chrome backdrop-blur transition-all duration-500 hover:border-magenta hover:text-white ${skipVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
          tabIndex={skipVisible ? 0 : -1} aria-hidden={!skipVisible}>
          SKIP INTRO <span aria-hidden>→</span>
        </button>
      )}

      {debug && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-50 font-label text-[10px] text-white">
          {mobile ? dbg(baseCues.mobile.gallery, "GALLERY (PHONE)", "border-2 border-magenta bg-magenta/10") : [
            dbg(Z.nav, "NAV", "border-sky-400"), dbg(Z.leftLane, "LEFT LANE", "border-amber-400"), dbg(Z.rightLane, "RIGHT LANE", "border-amber-400"),
            dbg(Z.floor, "FLOOR", "border-emerald-400"), dbg(Z.headline, "HEADLINE", "border-white"), dbg(Z.gallery, "GALLERY", "border-2 border-magenta bg-magenta/10"),
          ]}
        </div>
      )}
    </section>
  );
}
