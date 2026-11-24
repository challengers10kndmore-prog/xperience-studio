import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteData } from "@/data/DataProvider";
import { featuredOf, siteProjects } from "@/data/placeholders";
import { useMediaQuery } from "@/hooks/useInView";
import { mediaUrl } from "@/lib/media";
import { reducedMotion } from "@/motion/useReducedMotion";
import { isLite } from "@/lib/perf";
import { HeroCopy } from "@/components/sections/HeroStatic";
import { drawCover, frameSetFor, frameUrl, loadOrder, nearestLoaded, type Variant } from "./frames";
import { drawDots, makeDots } from "./DotFigure";
import { VideoWall } from "./VideoWall";
import { HeroHud } from "./HeroHud";

/** On wide screens the figure stands right of centre (the copy owns the left). Videos frame Daniel in the middle. */
const FIGURE_SHIFT = 0.15;
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * Hero "The Assembly", video-driven (no WebGL):
 * - hero-assembly is a WebP frame sequence on a canvas. Cursor proximity + movement scrub it forward, moving away scrubs back (damped).
 *   Touch: plays forward on load, then scroll scrubs it.
 * - At the last frame it crossfades to the hero-idle loop.
 * - Featured films orbit as CSS 3D cards. Scroll-out scrubs the assembly backwards and flies the cards forward.
 * - Until the videos are uploaded, a 2D dot figure stands in with the same behaviour.
 */
function HeroTicker() {
  const words = ["AI films", "Ads", "Music videos", "Product films", "Brand reveals", "Social edits", "Long-form", "Explainers"];
  const row = [...words, ...words];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-line/60 bg-void/40 py-2.5 backdrop-blur-sm [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div data-drift className="flex w-max gap-10 font-label text-[0.58rem] tracking-[0.3em] text-ash" style={{ animation: "ticker 40s linear infinite" }}>
        {[0, 1].map((k) => <span key={k} className="flex gap-10">{row.map((w, i) => <span key={i} className="flex items-center gap-10">{w.toUpperCase()}<span className="text-magenta">✦</span></span>)}</span>)}
      </div>
    </div>
  );
}

export function HeroVideo() {
  const data = useSiteData();
  const portrait = useMediaQuery("(max-aspect-ratio: 4/5)");
  const coarse = useMediaQuery("(hover: none), (pointer: coarse)");
  const variant: Variant = portrait ? "mobile" : "desktop";
  const assembly = data.sectionMedia["hero-assembly"];
  const idle = data.sectionMedia["hero-idle"];
  const set = assembly?.published ? frameSetFor(assembly, variant) : null;
  const idleSrc = idle?.published ? mediaUrl(portrait ? idle.mobile_url || idle.desktop_url : idle.desktop_url || idle.mobile_url) : undefined;
  const films = useMemo(() => { const all = siteProjects(data.projects); const f = featuredOf(all); return (f.length >= 4 ? f : all).slice(0, 10); }, [data.projects]);

  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const idleVideo = useRef<HTMLVideoElement>(null);
  const shardsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const progressRef = useRef(0);
  const [idleOn, setIdleOn] = useState(false);
  const idleOnRef = useRef(false);

  useEffect(() => {
    const cv = canvas.current!, ctx = cv.getContext("2d", { alpha: true })!;
    const reduced = reducedMotion();
    const cx = portrait ? 0.5 : 0.64;               // where the figure stands (fraction of width)
    const frames: (HTMLImageElement | null)[] = set ? new Array(set.count).fill(null) : [];
    const dots = set ? [] : makeDots(isLite() ? 650 : portrait ? 1100 : 1800);
    let alive = true, raf = 0, last = performance.now(), lastDrawn = -1, w = 0, h = 0;
    let target = reduced ? 1 : 0.06, progress = reduced ? 1 : 0, scroll = 0, shardAngle = 0;
    const startedAt = performance.now();
    let prevPointer: { x: number; y: number } | null = null;

    // --- size
    const resize = () => {
      const r = root.current!.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`; cv.style.height = `${h}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); lastDrawn = -1;
      shardsRef.current?.style.setProperty("--shard-w", `${Math.round(Math.max(110, Math.min(220, w * 0.14)))}px`);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(root.current!);

    // --- progressive frame loading (after the page is interactive, so it never competes with first paint)
    let loadTimer = 0;
    if (set) {
      const order = loadOrder(set.count);
      let next = 0, inflight = 0;
      const pump = () => {
        while (alive && inflight < 6 && next < order.length) {
          const i = order[next++]; inflight++;
          const img = new Image(); img.decoding = "async"; img.src = frameUrl(set, i);
          img.onload = () => { inflight--; frames[i] = img; lastDrawn = -1; pump(); };
          img.onerror = () => { inflight--; pump(); };
        }
      };
      const kick = () => pump();
      loadTimer = window.setTimeout(() => ("requestIdleCallback" in window ? (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(kick) : kick()), 300);
    }

    // --- input
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || scroll > 0.95) return;
      const r = root.current!.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const prox = 1 - clamp01(Math.hypot((x - cx) * 1.4, y - 0.5) / 0.7);
      const moved = prevPointer ? Math.hypot(e.clientX - prevPointer.x, e.clientY - prevPointer.y) : 0;
      prevPointer = { x: e.clientX, y: e.clientY };
      // Movement drives the scrub; proximity decides which way (near = assemble, far = scatter).
      const gain = clamp01(moved / 140);
      const goal = clamp01(prox * 1.35);
      target = clamp01(target + (goal - target) * gain * 0.9 + gain * 0.05 * prox);
    };
    const onLeave = () => { prevPointer = null; target = Math.min(target, 0.4); };
    const onScroll = () => {
      const r = root.current!.getBoundingClientRect();
      scroll = clamp01(-r.top / Math.max(1, r.height * 0.8));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // --- loop
    const shardEls = () => Array.from(shardsRef.current?.querySelectorAll<HTMLElement>("[data-shard]") ?? []);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (coarse && !reduced) target = clamp01((now - startedAt) / 8000); // touch: play forward on load
      progress = damp(progress, target, 3.2, dt);
      const eff = reduced ? 1 : clamp01(Math.min(progress, 1 - scroll * 1.25));
      scrollRef.current = scroll; progressRef.current = eff;

      // idle crossfade with hysteresis
      if (idleSrc && !idleOnRef.current && eff >= 0.995) { idleOnRef.current = true; setIdleOn(true); if (!reduced) idleVideo.current?.play().catch(() => {}); }
      else if (idleOnRef.current && eff < 0.9) { idleOnRef.current = false; setIdleOn(false); idleVideo.current?.pause(); }

      // draw
      if (set) {
        const idx = Math.round(eff * (set.count - 1));
        if (idx !== lastDrawn) {
          const img = nearestLoaded(frames, idx);
          if (img) { ctx.clearRect(0, 0, w, h); drawCover(ctx, img, set.w, set.h, w, h, 0.5, portrait ? 0 : FIGURE_SHIFT); lastDrawn = idx; }
        }
      } else if (scroll < 1) {
        drawDots(ctx, dots, eff, w, h, now / 1000, cx);
      }

      // shards orbit (CSS 3D)
      const els = shardEls();
      if (els.length) {
        const appear = smooth(0.82, 1, Math.max(eff, scroll > 0 ? 0 : eff));
        shardAngle += dt * 0.22;
        const R = Math.min(w * 0.22, 340), ox = w * cx, oy = h * 0.48;
        els.forEach((el, i) => {
          const a = shardAngle + (i / els.length) * Math.PI * 2;
          const z = Math.sin(a) * R * 0.8 + scroll * 1400;
          const x = ox + Math.cos(a) * R;
          const y = oy + Math.sin(a * 1.7 + i) * h * 0.08 + ((i % 3) - 1) * h * 0.09;
          const back = z < 0;
          const op = appear * (back ? 0.4 : 1) * (1 - smooth(0.2, 0.75, scroll));
          el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -50%) rotateY(${(-Math.cos(a) * 25).toFixed(1)}deg)`;
          el.style.opacity = op.toFixed(3);
          el.style.zIndex = String(Math.round(z + 2000));
          el.style.pointerEvents = op > 0.5 ? "auto" : "none";
          el.style.filter = back ? "blur(1.5px) saturate(.7)" : "";
        });
      }
      raf = requestAnimationFrame(tick);
    };
    // pause the loop entirely when the hero is far off-screen
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }, { rootMargin: "100px" });
    io.observe(root.current!);

    return () => {
      alive = false; cancelAnimationFrame(raf); clearTimeout(loadTimer); ro.disconnect(); io.disconnect();
      window.removeEventListener("pointermove", onMove); window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [set, idleSrc, portrait, coarse]);

  return (
    <section ref={root} id="top" className="section relative flex min-h-svh flex-col justify-end overflow-hidden pb-[12svh] pt-[var(--nav-h)]">
      <div aria-hidden className="absolute inset-0 -z-10 bg-void">
        {!set && <div className="media-placeholder absolute inset-0 opacity-70" />}
        <VideoWall films={films} cx={portrait ? 0.5 : 0.64} scroll={scrollRef} />
        {/* the figure is "screened" over the wall: its dark background lets the films glow through */}
        <canvas ref={canvas} className="absolute inset-0 mix-blend-screen" />
        {idleSrc && (
          <video ref={idleVideo} src={idleSrc} poster={mediaUrl(idle?.poster_url)} muted loop playsInline preload="none"
            className={`absolute inset-0 h-full w-full object-cover mix-blend-screen transition-opacity duration-700 ${idleOn ? "opacity-100" : "opacity-0"}`}
            style={portrait ? undefined : { transform: `translateX(${FIGURE_SHIFT * 100}%)` }} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,6,13,.92)_0%,rgba(7,6,13,.55)_32%,rgba(7,6,13,0)_60%)] max-md:bg-[linear-gradient(0deg,rgba(7,6,13,.95)_0%,rgba(7,6,13,.4)_45%,rgba(7,6,13,0)_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />
      </div>
      <HeroHud progress={progressRef} cx={portrait ? 0.5 : 0.64} />
      <div ref={shardsRef} hidden />
      <HeroCopy />
      <HeroTicker />
      <div aria-hidden className="pointer-events-none absolute bottom-16 right-[var(--gutter)] z-10 hidden flex-col items-end gap-2 md:flex">
        <span className="eyebrow !text-[0.55rem]">Move closer to assemble · scroll</span>
        <span className="relative h-10 w-px overflow-hidden bg-chrome/20"><span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_1.8s_ease-in-out_infinite] bg-magenta" /></span>
      </div>
    </section>
  );
}
