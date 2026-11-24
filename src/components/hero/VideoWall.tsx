import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { artFor, type SiteProject } from "@/data/placeholders";
import { isPlayableUrl, mediaUrl } from "@/lib/media";
import { isLite } from "@/lib/perf";
import { reducedMotion } from "@/motion/useReducedMotion";

const SPACING = 21;       // degrees between panels on the arc
const SPEED = 1.6;        // degrees per second (continuous drift)

/**
 * A curved wall of film previews standing behind the hero figure (CSS 3D, no WebGL). It drifts continuously;
 * only the panels facing the viewer play video (posters only in lite mode). Scroll-out flies the panels apart.
 */
export function VideoWall({ films, cx, scroll }: { films: SiteProject[]; cx: number; scroll: MutableRefObject<number> }) {
  const root = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    if (!films.length) return [];
    const out: SiteProject[] = [];
    while (out.length < 10) out.push(...films);
    return out.slice(0, 10);
  }, [films]);

  useEffect(() => {
    const el = root.current; if (!el || !items.length) return;
    const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-panel]"));
    const span = items.length * SPACING;
    const lite = isLite() || reducedMotion();
    let raf = 0, last = performance.now(), base = 0, visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { last = performance.now(); raf = requestAnimationFrame(tick); } }, { rootMargin: "50px" });
    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!lite) base = (base + SPEED * dt) % span;
      const s = scroll.current;
      const R = Math.min(window.innerWidth * 0.55, 820);
      panels.forEach((p, i) => {
        let a = ((i * SPACING + base) % span) - span / 2;       // -span/2 .. span/2
        if (a < -span / 2) a += span;
        const vis = Math.abs(a) < 62;
        // leave a gap where the figure stands, so the films sit behind and beside him rather than over him
        const gap = Math.min(1, Math.max(0, (Math.abs(a) - 17) / 14));
        const fade = Math.max(0, 1 - Math.abs(a) / 62) * (gap * gap * (3 - 2 * gap));
        const spread = 1 + s * 1.6;
        p.style.transform = `rotateY(${(a * spread).toFixed(2)}deg) translateZ(${(-R + s * 900).toFixed(0)}px)`;
        p.style.opacity = vis ? (fade * 0.85 * (1 - Math.min(1, s * 1.4))).toFixed(3) : "0";
        const v = p.querySelector("video");
        if (v) { if (vis && Math.abs(a) < 40 && s < 0.9) { if (v.paused) v.play().catch(() => {}); } else if (!v.paused) v.pause(); }
      });
      if (visible && !lite) raf = requestAnimationFrame(tick);
    }
    io.observe(el);
    raf = requestAnimationFrame(tick);
    const onScroll = () => { if (lite) tick(performance.now()); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, [items, scroll]);

  if (!items.length) return null;
  const lite = isLite();
  return (
    <div ref={root} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1100px]" style={{ perspectiveOrigin: `${cx * 100}% 45%` }}>
      <div className="absolute top-[36%] [transform-style:preserve-3d]" style={{ left: `${cx * 100}%` }}>
        {items.map((p, i) => {
          const poster = mediaUrl(p.poster_url);
          const src = mediaUrl(p.teaser_url || p.video_url);
          return (
            <div key={`${p.id}-${i}`} data-panel className="absolute overflow-hidden rounded-xl border border-chrome/15 bg-carbon will-change-transform [backface-visibility:hidden]"
              style={{ width: "clamp(240px, 27vw, 480px)", aspectRatio: "16/9", left: "calc(clamp(240px, 27vw, 480px) / -2)", top: "calc(clamp(240px, 27vw, 480px) * -0.28)", opacity: 0, boxShadow: "0 0 60px -10px rgba(124,58,237,.45)" }}>
              {poster ? <img src={poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0" style={{ background: artFor(p.id, p.discipline) }} />}
              {!lite && src && isPlayableUrl(src) && <video src={src} muted loop playsInline preload="none" poster={poster} className="absolute inset-0 h-full w-full object-cover" />}
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(124,58,237,.18),rgba(7,6,13,.35))]" />
              <span className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,.18)_0_1px,transparent_1px_3px)]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
