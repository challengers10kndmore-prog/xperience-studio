import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSiteData } from "@/data/DataProvider";
import { artFor, featuredOf, siteProjects, type SiteProject } from "@/data/placeholders";
import type { SectionMedia } from "@/data/types";
import { useMediaQuery } from "@/hooks/useInView";
import { isPlayableUrl, mediaUrl } from "@/lib/media";
import { displayTitle } from "@/lib/titles";
import { isLite } from "@/lib/perf";
import { reducedMotion } from "@/motion/useReducedMotion";
import { gsap, SplitText } from "@/motion/gsap";
import { scrollToTarget } from "@/motion/SmoothScroll";
import { Magnetic } from "@/motion/Magnetic";
import { RollText } from "@/components/kinetic/RollText";
import { NavMark } from "@/components/brand/NavMark";
import { parseCues, withFallbacks, type Zone } from "./cues";

/**
 * Hero film player.
 * hero-intro plays once per session, then hero-loop loops. Featured films appear only inside the gallery zone,
 * on the cue times in site_settings.hero_cues. The headline starts large and centred, then docks top-left on its cue.
 * Mobile: vertical intro, then hero-loop (mobile) or the existing hero-idle loop, cards in the upper middle.
 * Add ?zones=1 to the URL to see the layout zones drawn over the film.
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
const zoneRect = (z: Zone, f: Rect): Rect => ({ x: f.x + (z.left / 100) * f.w, y: f.y + (z.top / 100) * f.h, w: ((z.right - z.left) / 100) * f.w, h: ((z.bottom - z.top) / 100) * f.h });

/** Union of the rendered text itself (SplitText's line wrappers are full-width blocks, so the element box lies). */
function textBounds(el: HTMLElement): DOMRect {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const range = document.createRange();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.textContent?.trim()) continue;
    range.selectNodeContents(n);
    for (const q of Array.from(range.getClientRects())) { l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
  }
  return l < r ? new DOMRect(l, t, r - l, b - t) : new DOMRect(0, 0, 0, 0);
}

type CardItem = { key: number; p: SiteProject; leaving?: boolean };

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
  const loopPoster = mediaUrl((mobile ? null : loop?.poster_url) || loop?.poster_url || intro?.poster_url);
  const introPoster = mediaUrl(intro?.poster_url);

  const films = useMemo(() => { const all = siteProjects(data.projects); const f = featuredOf(all); return f.length ? f : all; }, [data.projects]);
  const baseCues = useMemo(() => parseCues(settings.hero_cues), [settings.hero_cues]);
  const maxCards = mobile || lite ? 2 : 3;

  const root = useRef<HTMLElement>(null);
  const introV = useRef<HTMLVideoElement>(null);
  const loopV = useRef<HTMLVideoElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const startInLoop = reduced || seen() || !introSrc;
  const [phase, setPhase] = useState<"wait" | "intro" | "loop">(startInLoop ? "loop" : "wait");
  const [docked, setDocked] = useState(startInLoop);
  const [skipVisible, setSkipVisible] = useState(false);
  const [cards, setCards] = useState<CardItem[]>(() => (reduced ? films.slice(0, maxCards).map((p, i) => ({ key: i, p })) : []));
  const [box, setBox] = useState<{ W: number; H: number; frame: Rect }>({ W: 1440, H: 810, frame: { x: 0, y: 0, w: 1440, h: 810 } });
  const keyRef = useRef(100);
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const skipRef = useRef<() => void>(() => {});

  // ---- measure: viewport + where the film frame sits
  useEffect(() => {
    const measure = () => {
      const r = root.current!.getBoundingClientRect();
      const v = (phaseRef.current === "loop" ? loopV.current : introV.current) ?? loopV.current;
      const vw = v?.videoWidth || (mobile ? 1080 : 1920), vh = v?.videoHeight || (mobile ? 1920 : 1080);
      setBox({ W: r.width, H: r.height, frame: coverRect(r.width, r.height, vw, vh) });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(root.current!);
    const vids = [introV.current, loopV.current].filter(Boolean) as HTMLVideoElement[];
    vids.forEach((v) => v.addEventListener("loadedmetadata", measure));
    return () => { ro.disconnect(); vids.forEach((v) => v.removeEventListener("loadedmetadata", measure)); };
  }, [mobile, phase]);

  // ---- cards: add on cue, oldest hands off when the stage is full
  const addCard = useCallback((slot: number) => {
    if (!films.length) return;
    setCards((cs) => {
      const live = cs.filter((c) => !c.leaving);
      // the slot's film; if it is already on stage, the next film that isn't (keeps 2-3 different films up)
      let p = films[(slot - 1) % films.length];
      for (let k = 0; k < films.length && live.some((c) => c.p.id === p.id); k++) p = films[(slot + k) % films.length];
      if (live[0]?.p.id === p.id) return cs;
      const next = [{ key: keyRef.current++, p }, ...cs.map((c) => (c.p.id === p.id ? { ...c, leaving: true } : c))];
      const alive = next.filter((c) => !c.leaving);
      if (alive.length > maxCards) { const drop = alive[alive.length - 1].key; return next.map((c) => (c.key === drop ? { ...c, leaving: true } : c)); }
      return next;
    });
  }, [films, maxCards]);

  // ---- headline dock (3D move from centre-stage to top-left)
  const dock = useCallback(() => setDocked(true), []);
  // while undocked: park it big and centred over the film (re-measured on resize)
  useLayoutEffect(() => {
    const el = headRef.current; if (!el || docked) return;
    gsap.set(el, { clearProps: "transform" });
    // centre the actual text (the lines are left-aligned inside a wider box)
    const t = textBounds(el), b = el.getBoundingClientRect();
    const r = t.width > 0 ? t : b, R = root.current!.getBoundingClientRect();
    const S = Math.min(mobile ? 1.5 : 2.4, (R.width * (mobile ? 0.88 : 0.72)) / Math.max(1, r.width));
    // scale about the text's own centre so it lands dead centre
    gsap.set(el, { x: R.width / 2 - (r.left - R.left + r.width / 2), y: R.height * (mobile ? 0.42 : 0.5) - (r.top - R.top + r.height / 2), scale: S,
      transformOrigin: `${r.left - b.left + r.width / 2}px ${r.top - b.top + r.height / 2}px` });
    gsap.set(restRef.current, { autoAlpha: 0, y: 24 });
  }, [docked, mobile, box.W, box.H]);
  const wasDocked = useRef(docked);
  useLayoutEffect(() => {
    if (!docked || wasDocked.current) return;
    wasDocked.current = true;
    const el = headRef.current!, rest = restRef.current!;
    if (reduced) { gsap.set(el, { clearProps: "transform" }); gsap.set(rest, { autoAlpha: 1, y: 0 }); return; }
    const tl = gsap.timeline();
    tl.to(el, { x: 0, y: 0, scale: 1, duration: 1.5, ease: "expo" }, 0)
      .to(el, { keyframes: [{ rotationY: -18, rotationX: 10, z: -160, duration: 0.6, ease: "power2.out" }, { rotationY: 0, rotationX: 0, z: 0, duration: 0.9, ease: "power3.out" }] }, 0)
      .to(rest, { autoAlpha: 1, y: 0, duration: 1, ease: "expo" }, 0.7);
  }, [docked, reduced]);

  // ---- headline entrance: words flip up out of a mask
  useLayoutEffect(() => {
    const h = headRef.current?.querySelector("h1"); if (!h || reduced) return;
    const split = SplitText.create(h, { type: "lines,words", mask: "lines" });
    split.words.forEach((w) => { if ((w as HTMLElement).querySelector("[data-hl]")) (w as HTMLElement).classList.add("text-gradient"); });
    const tl = gsap.timeline({ paused: true }).from(split.words, { yPercent: 115, rotationX: -80, transformOrigin: "50% 100%", stagger: 0.06, duration: 1.3, ease: "expo" });
    const go = () => tl.play();
    if (document.documentElement.classList.contains("is-loading")) window.addEventListener("xp:ignited", go, { once: true }); else gsap.delayedCall(0.1, go);
    return () => { window.removeEventListener("xp:ignited", go); tl.kill(); split.revert(); };
  }, [settings.hero_headline, reduced]);

  // ---- playback + cue clock
  useEffect(() => {
    if (reduced) return;
    const iv = introV.current, lv = loopV.current;
    let raf = 0, prevT = -1, lastPhase = phaseRef.current, alive = true;
    const cuesFor = () => {
      return withFallbacks(baseCues, iv?.duration || 0, lv?.duration || 0, films.length);
    };
    const toLoop = () => {
      if (!alive || phaseRef.current === "loop") return;
      markSeen(); setSkipVisible(false);
      if (lv) { lv.currentTime = 0; lv.play().catch(() => {}); }
      setPhase("loop"); phaseRef.current = "loop"; setDocked(true);
      iv?.pause();
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
    skipRef.current = toLoop;

    if (phaseRef.current === "wait") {
      if (document.documentElement.classList.contains("is-loading")) window.addEventListener("xp:ignited", startIntro, { once: true });
      else startIntro();
    } else if (lv) { lv.play().catch(() => {}); }

    const tick = () => {
      const ph = phaseRef.current;
      const v = ph === "intro" ? iv : ph === "loop" ? lv : null;
      if (v && v.readyState >= 1) {
        const c = cuesFor();
        const t = v.currentTime;
        if (ph !== lastPhase) { prevT = -1; lastPhase = ph; }
        if (t < prevT - 0.5) prevT = -1; // loop wrapped
        const list = ph === "intro" ? c.cards : c.loopCards;
        for (const cue of list) if (cue.at > prevT && cue.at <= t) addCard(cue.slot);
        if (ph === "intro" && c.headlineDockAt !== null && prevT < c.headlineDockAt && t >= c.headlineDockAt) dock();
        prevT = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // pause everything while the hero is off-screen
    const io = new IntersectionObserver(([e]) => {
      const v = phaseRef.current === "intro" ? iv : lv;
      if (!v) return;
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    });
    io.observe(root.current!);
    return () => {
      alive = false; cancelAnimationFrame(raf); io.disconnect();
      iv?.removeEventListener("ended", onEnded); iv?.removeEventListener("error", onErr);
      window.removeEventListener("xp:ignited", startIntro);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introSrc, loopSrc, baseCues, films.length, reduced]);

  // ---- card choreography (fly in from depth, re-arrange, hand off)
  const zone = useMemo(() => {
    const z = mobile ? baseCues.zones.galleryMobile : baseCues.zones.gallery;
    return clampRect(zoneRect(z, box.frame), box.W, box.H, 8);
  }, [mobile, baseCues, box]);
  const cw = mobile ? Math.min(zone.w * 0.62, zone.h * 0.72 * (16 / 9)) : Math.min(zone.w * 0.46, zone.h * 0.6 * (16 / 9));
  const ch = cw * (9 / 16);
  const posFor = useCallback((rank: number) => {
    const P = mobile
      ? [{ fx: 0.6, fy: 0.6, z: 0, ry: -8, rx: 4, o: 1 }, { fx: 0.3, fy: 0.36, z: -170, ry: 16, rx: 6, o: 0.75 }]
      : [{ fx: 0.5, fy: 0.6, z: 0, ry: 0, rx: 4, o: 1 }, { fx: 0.24, fy: 0.36, z: -200, ry: 20, rx: 6, o: 0.8 }, { fx: 0.76, fy: 0.36, z: -200, ry: -20, rx: 6, o: 0.8 }];
    const q = P[Math.min(rank, P.length - 1)];
    return { x: zone.w * q.fx - cw / 2, y: zone.h * q.fy - ch / 2, z: q.z, rotationY: q.ry, rotationX: q.rx, opacity: q.o, scale: 1 };
  }, [zone, cw, ch, mobile]);

  const seenKeys = useRef(new Set<number>());
  useLayoutEffect(() => {
    const stage = stageRef.current; if (!stage) return;
    let rank = 0;
    for (const c of cards) {
      const el = stage.querySelector<HTMLElement>(`[data-card="${c.key}"]`); if (!el) continue;
      if (c.leaving) {
        gsap.to(el, { z: 260, x: `+=${(rank % 2 ? -1 : 1) * cw * 0.6}`, rotationY: rank % 2 ? 30 : -30, opacity: 0, duration: 0.9, ease: "power3.in", overwrite: true,
          onComplete: () => setCards((cs) => cs.filter((x) => x.key !== c.key)) });
        continue;
      }
      const to = posFor(rank++);
      if (!seenKeys.current.has(c.key)) {
        seenKeys.current.add(c.key);
        if (reduced) { gsap.set(el, to); continue; }
        gsap.fromTo(el, { x: to.x, y: to.y + ch * 0.2, z: -1400, rotationY: -38, rotationX: 22, opacity: 0, scale: 0.9 },
          { ...to, duration: 1.4, ease: "expo", overwrite: true });
        const sw = el.querySelector("[data-sweep]");
        if (sw && !lite) gsap.fromTo(sw, { xPercent: 0, opacity: 0.9 }, { xPercent: 420, opacity: 0, duration: 1.3, ease: "power2.inOut", delay: 0.45 });
      } else {
        gsap.to(el, { ...to, duration: 1.1, ease: "expo", overwrite: true });
      }
    }
  }, [cards, posFor, cw, ch, reduced, lite]);

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

  // ---- layout numbers
  const Z = baseCues.zones;
  const f = box.frame;
  const gutter = Math.max(16, Math.min(56, box.W * 0.04));
  const dockLeft = mobile ? gutter : Math.max(gutter, f.x + (Z.dock.left / 100) * f.w);
  const dockTop = Math.max(box.H * 0.09 + 8, f.y + (Z.dock.top / 100) * f.h);
  const laneW = Math.max(260, Math.min(box.W * 0.34, (Z.lane / 100) * f.w + 40));
  const floorTop = Math.min(box.H - 230, f.y + ((100 - Z.floor) / 100) * f.h);
  const live = cards.filter((c) => !c.leaving);
  const playLoop = phase === "loop";

  return (
    <section ref={root} id="top" data-hero="film" className="relative isolate h-svh min-h-[560px] w-full overflow-hidden bg-void [perspective:1200px]" style={{ ["--cw" as string]: `${cw}px`, ["--ch" as string]: `${ch}px` }}>
      {/* video layer */}
      <div aria-hidden className="absolute inset-0 z-0">
        {reduced ? (
          <img src={loopPoster || introPoster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            {loopSrc && <video ref={loopV} src={mediaUrl(loopSrc)} poster={loopPoster} muted loop playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" />}
            {introSrc && !startInLoop && (
              <video ref={introV} src={mediaUrl(introSrc)} poster={introPoster} muted playsInline preload="auto"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${playLoop ? "opacity-0" : "opacity-100"}`} />
            )}
          </>
        )}
        <div className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-void/70 to-transparent" />
        <div className={`absolute inset-0 transition-opacity duration-1000 ${docked ? "opacity-100" : "opacity-0"} bg-[linear-gradient(90deg,rgba(7,6,13,.75)_0%,rgba(7,6,13,.25)_26%,rgba(7,6,13,0)_40%)] max-md:bg-[linear-gradient(0deg,rgba(7,6,13,.95)_0%,rgba(7,6,13,.5)_30%,rgba(7,6,13,0)_55%)]`} />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-void to-transparent" />
      </div>

      {/* gallery zone: work samples only ever appear in here, always above the film */}
      <div ref={zoneRef} data-zone="gallery" data-offscreen-ok className="absolute z-20 [transform-style:preserve-3d]"
        style={{ left: zone.x, top: zone.y, width: zone.w, height: zone.h, perspective: 1400 }}>
        <div ref={stageRef} className="relative h-full w-full [transform-style:preserve-3d]">
          {cards.map((c) => <FilmCard key={c.key} item={c} active={!reduced && c.key === live[0]?.key} onOpen={onOpen} />)}
        </div>
      </div>

      {/* phones: headline + copy stack at the bottom; desktop: each part sits in its own lane */}
      <div className={mobile ? "absolute z-30 flex flex-col gap-5" : "contents"}
        style={mobile ? { left: gutter, right: gutter, bottom: "calc(2rem + env(safe-area-inset-bottom))" } : undefined}>
      {/* headline (big + centred during the intro, docked top-left after its cue) */}
      <div ref={headRef} className={`${mobile ? "relative" : "absolute"} z-30 [transform-style:preserve-3d]`}
        style={mobile ? undefined : { left: dockLeft, top: dockTop, width: laneW }}>
        <h1 key={settings.hero_headline} className="text-balance font-semibold leading-[0.92] [text-shadow:0_4px_30px_rgba(7,6,13,.6)] text-[clamp(2.3rem,9vw,3.4rem)] md:text-[clamp(2rem,1rem+2.4vw,3.9rem)]">
          {(settings.hero_headline ?? "").split(" ").map((w, i, arr) => (
            <span key={i} data-hl={i === 1 && arr.length > 2 ? "" : undefined}>{w}{i < arr.length - 1 ? " " : ""}</span>
          ))}
        </h1>
      </div>

      {/* the rest of the copy: floor lane, left */}
      <div ref={restRef} className={`${mobile ? "relative" : "absolute"} z-30 space-y-5`}
        style={mobile ? undefined : { left: dockLeft, top: floorTop, width: Math.min(box.W * 0.5, 640) }}>
        <p className="max-w-md text-[clamp(0.95rem,0.85rem+0.3vw,1.1rem)] text-chrome/80 max-md:line-clamp-2">{settings.hero_sub}</p>
        <div className="flex flex-wrap gap-3">
          <Magnetic><button type="button" onClick={() => scrollToTarget("#library")} className="btn btn-primary" data-cursor="play"><RollText>{settings.hero_cta_primary ?? "Watch the reel"}</RollText></button></Magnetic>
          <Magnetic><button type="button" onClick={() => scrollToTarget("#contact")} className="btn btn-ghost"><RollText>{settings.hero_cta_secondary ?? "Start a project"}</RollText></button></Magnetic>
        </div>
        <p className="hidden items-center gap-2.5 text-sm text-ash md:flex"><NavMark className="h-6 w-6" /> {settings.credit_line}</p>
      </div>
      </div>

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
          <div className="absolute border border-dashed border-sky-400" style={{ left: f.x, top: f.y, width: f.w, height: (Z.nav / 100) * f.h }}><span className="bg-sky-500 px-1">NAV</span></div>
          <div className="absolute border border-dashed border-amber-400" style={{ left: f.x, top: f.y, width: (Z.lane / 100) * f.w, height: f.h }}><span className="absolute bottom-1/2 bg-amber-500 px-1">LEFT LANE</span></div>
          <div className="absolute border border-dashed border-amber-400" style={{ left: f.x + f.w * (1 - Z.lane / 100), top: f.y, width: (Z.lane / 100) * f.w, height: f.h }}><span className="absolute bottom-1/2 bg-amber-500 px-1">RIGHT LANE</span></div>
          <div className="absolute border border-dashed border-emerald-400" style={{ left: f.x, top: f.y + f.h * (1 - Z.floor / 100), width: f.w, height: (Z.floor / 100) * f.h }}><span className="bg-emerald-500 px-1">FLOOR</span></div>
          <div className="absolute border-2 border-magenta bg-magenta/10" style={{ left: zone.x, top: zone.y, width: zone.w, height: zone.h }}><span className="bg-magenta px-1">GALLERY</span></div>
        </div>
      )}
    </section>
  );
}
