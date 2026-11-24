import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useSiteData } from "@/data/DataProvider";
import { siteProjects, artFor, type SiteProject } from "@/data/placeholders";
import { usePlayer } from "@/components/media/Player";
import { Tags } from "@/components/media/ProjectMedia";
import { MarkEmblem } from "@/components/brand/LogoStage";
import { useInView, useMediaQuery } from "@/hooks/useInView";
import { isPlayableUrl, mediaUrl } from "@/lib/media";
import { formatDuration } from "@/lib/utils";
import { displayTitle } from "@/lib/titles";
import { isLite } from "@/lib/perf";
import { reducedMotion } from "@/motion/useReducedMotion";

const pretty = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
type Filter = { discipline: "all" | "ai" | "editing"; originals: boolean };
const BASE_SPEED = 7; // degrees per second

/**
 * Work: a continuously turning 3D ring of film cards over a reflective neon floor (~68% of the screen).
 * The front card plays its preview; drag to spin, click a card to bring it forward, click the front one to watch.
 * Controls: previous, pause / play the movement, fast-forward (next film), 2× speed. Pure CSS 3D, no WebGL.
 */
export function WorkCarousel({ heading = true }: { heading?: boolean }) {
  const data = useSiteData();
  const all = useMemo(() => siteProjects(data.projects), [data.projects]);
  const copy = data.settings.copy.library;
  const mobile = useMediaQuery("(max-width: 767px)");
  const [f, setF] = useState<Filter>({ discipline: "all", originals: false });
  const cap = mobile ? 8 : 14;
  const films = useMemo(() => all.filter((p) => (f.discipline === "all" || p.discipline === f.discipline) && (!f.originals || p.is_xperience_original)).slice(0, cap), [all, f, cap]);
  const n = films.length;
  const step = n ? 360 / n : 360;

  const stage = useRef<HTMLElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const angle = useRef(0);          // current ring rotation (deg)
  const target = useRef<number | null>(null); // snapping target (deg)
  const drag = useRef<{ x: number; a: number; moved: boolean } | null>(null);
  const vel = useRef(0);
  const [front, setFront] = useState(0);
  const [playing, setPlaying] = useState(!reducedMotion());
  const [fast, setFast] = useState(false);
  const [hover, setHover] = useState(false);
  const inView = useInView(stage, "0px");
  const open = usePlayer();

  const cardW = mobile ? 0.74 : 0.34; // fraction of viewport width
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1440));
  useEffect(() => { const r = () => setVw(window.innerWidth); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r); }, []);
  const W = Math.min(vw * cardW, 560);
  const R = n > 1 ? Math.max(W * 0.9, (W / 2 / Math.tan(Math.PI / n)) * 1.08) : 0;

  useEffect(() => { angle.current = 0; target.current = null; setFront(0); }, [f]);

  const frontOf = useCallback((a: number) => (n ? ((Math.round(-a / step) % n) + n) % n : 0), [n, step]);
  const goTo = useCallback((i: number) => {
    // shortest rotation to bring card i to the front
    const cur = angle.current; const want = -i * step;
    const k = Math.round((cur - want) / 360);
    target.current = want + k * 360;
  }, [step]);
  const nudge = (dir: 1 | -1) => goTo(frontOf(target.current ?? angle.current) + dir);

  // animation loop
  useEffect(() => {
    if (!inView || !ring.current) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!drag.current) {
        if (target.current !== null) {
          angle.current += (target.current - angle.current) * (1 - Math.exp(-6 * dt));
          if (Math.abs(target.current - angle.current) < 0.05) { angle.current = target.current; target.current = null; }
        } else if (Math.abs(vel.current) > 0.5) {
          angle.current += vel.current * dt; vel.current *= Math.exp(-3 * dt);
        } else if (playing && !hover && n > 1) {
          angle.current -= BASE_SPEED * (fast ? 2.4 : 1) * dt;
        }
      }
      ring.current!.style.transform = `translateZ(${-R}px) rotateY(${angle.current}deg)`;
      const fi = frontOf(angle.current);
      setFront((x) => (x === fi ? x : fi));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, playing, hover, fast, n, R, frontOf]);

  // keyboard while visible
  useEffect(() => {
    if (!inView) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[role=dialog]") || /INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cur = films[front];
  return (
    <section ref={stage} id="library" aria-roledescription="carousel" aria-label={copy.headline}
      className="relative w-full overflow-hidden bg-void py-[clamp(2rem,5vh,3.5rem)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_55%,rgba(124,58,237,.18),transparent_70%)]" />
      {heading && (
        <div className="section relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3 flex items-center gap-3"><MarkEmblem className="h-5 w-5" /><span className="timecode text-magenta">WORK</span>{copy.sub}</p>
            <h2 className="section-title !text-[clamp(2.2rem,5vw,4.6rem)]">{copy.headline}</h2>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter work">
            {(["all", "ai", "editing"] as const).map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={f.discipline === d} onClick={() => setF((x) => ({ ...x, discipline: d }))}>{d === "all" ? "All" : d === "ai" ? "AI Video" : "Video Editing"}</button>
            ))}
            <button type="button" className="chip" aria-pressed={f.originals} onClick={() => setF((x) => ({ ...x, originals: !x.originals }))}>Xperience Originals</button>
          </div>
        </div>
      )}

      {/* the 3D stage: ~68% of the screen */}
      <div className="relative mx-auto mt-2 h-[clamp(380px,62vh,760px)] select-none [perspective:1600px] [perspective-origin:50%_50%]"
        onPointerDown={(e) => { drag.current = { x: e.clientX, a: angle.current, moved: false }; target.current = null; vel.current = 0; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d) return;
          const dx = e.clientX - d.x; if (Math.abs(dx) > 4) d.moved = true;
          const prev = angle.current; angle.current = d.a + dx * 0.18; vel.current = (angle.current - prev) * 60;
        }}
        onPointerUp={() => { const d = drag.current; drag.current = null; if (d?.moved) { const v = vel.current; vel.current = 0; goTo(frontOf(angle.current - v * 0.25)); } }}
        onPointerLeave={() => setHover(false)} style={{ touchAction: "pan-y" }}>
        <div className="neon-floor pointer-events-none absolute inset-x-0 bottom-0 h-[38%]" />
        <div ref={ring} className="absolute left-1/2 top-[46%] [transform-style:preserve-3d]" style={{ width: 0, height: 0 }}>
          {films.map((p, i) => (
            <Card key={p.id} p={p} i={i} W={W} R={R} step={step} isFront={i === front} near={Math.min(Math.abs(i - front), n - Math.abs(i - front)) <= 1}
              onEnter={() => setHover(true)} onLeave={() => setHover(false)}
              onClick={(el) => { if (drag.current?.moved) return; if (i === front) open(p, el); else goTo(i); }} />
          ))}
        </div>
        {n === 0 && <p className="absolute inset-0 grid place-items-center text-ash">Nothing in this filter yet.</p>}
      </div>

      {/* front film info + controls */}
      {cur && (
        <div className="section relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl space-y-2.5" aria-live="polite">
            <Tags p={cur} />
            <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.8rem)] font-semibold leading-[0.95]">{displayTitle(cur.title)}</h3>
            {(cur.caption || cur.brief) && <p className="text-chrome/75">{cur.caption || cur.brief}</p>}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button type="button" className="btn btn-primary !py-3" data-cursor="play" aria-label={`Play ${cur.title} with sound`} onClick={(e) => open(cur, e.currentTarget)}>
                <Volume2 className="size-4" /> Watch with sound
              </button>
              <span className="timecode text-sm text-ash">{String(front + 1).padStart(2, "0")} / {String(n).padStart(2, "0")} · {formatDuration(cur.duration_s)}{cur.category ? ` · ${pretty(cur.category)}` : ""}</span>
            </div>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Carousel controls">
            <Ctrl label="Previous film" onClick={() => nudge(-1)}><SkipBack className="size-5" /></Ctrl>
            <Ctrl label={playing ? "Pause the movement" : "Play the movement"} onClick={() => setPlaying((x) => !x)} big>{playing ? <Pause className="size-6" /> : <Play className="size-6" />}</Ctrl>
            <Ctrl label="Fast-forward to the next film" onClick={() => nudge(1)}><SkipForward className="size-5" /></Ctrl>
            <button type="button" onClick={() => setFast((x) => !x)} aria-pressed={fast} aria-label="Double speed"
              className={`timecode rounded-full border px-3 py-2 text-xs transition ${fast ? "border-magenta bg-magenta/20 text-chrome" : "border-line bg-void/55 text-ash hover:text-chrome"}`}>2×</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Ctrl({ label, onClick, children, big }: { label: string; onClick: () => void; children: React.ReactNode; big?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className={`grid place-items-center rounded-full border border-line bg-void/55 text-chrome backdrop-blur transition hover:border-violet hover:bg-violet/20 ${big ? "h-14 w-14" : "h-11 w-11"}`}>{children}</button>
  );
}

function Card({ p, i, W, R, step, isFront, near, onClick, onEnter, onLeave }: {
  p: SiteProject; i: number; W: number; R: number; step: number; isFront: boolean; near: boolean;
  onClick: (el: HTMLElement) => void; onEnter: () => void; onLeave: () => void;
}) {
  const vid = useRef<HTMLVideoElement>(null);
  const poster = mediaUrl(p.show_caption && p.cover_url ? p.cover_url : p.poster_url);
  const src = mediaUrl(p.teaser_url || p.video_url);
  const playable = src && isPlayableUrl(src) ? src : undefined;
  const vertical = p.aspect_ratio === "9:16" || p.aspect_ratio === "4:5" || p.aspect_ratio === "1:1";
  useEffect(() => { const v = vid.current; if (!v) return; if (isFront) v.play().catch(() => {}); else v.pause(); }, [isFront]);
  const H = W * 9 / 16;
  return (
    <button type="button" data-cursor={isFront ? "play" : "view"} aria-label={isFront ? `Play ${p.title}` : `Show ${displayTitle(p.title)}`}
      onClick={(e) => onClick(e.currentTarget)} onPointerEnter={onEnter} onPointerLeave={onLeave}
      className="chrome-card absolute block overflow-hidden text-left [backface-visibility:hidden]"
      style={{ width: W, height: H, left: -W / 2, top: -H / 2, transform: `rotateY(${i * step}deg) translateZ(${R}px)`,
        WebkitBoxReflect: isLite() ? undefined : "below 10px linear-gradient(transparent 55%, rgba(255,255,255,.32))" } as React.CSSProperties}>
      <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {poster ? <img src={poster} alt="" loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full ${vertical ? "lite-noblur scale-110 object-cover opacity-60 blur-xl" : "object-cover"}`} />
          : <span className="absolute inset-0" style={{ background: artFor(p.id, p.discipline) }} />}
        {vertical && poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-contain" />}
        {playable && near && !isLite() && <video ref={vid} src={playable} muted playsInline loop preload={isFront ? "auto" : "metadata"} poster={poster}
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${vertical ? "object-contain" : "object-cover"} ${isFront ? "opacity-100" : "opacity-0"}`} />}
        {playable && isLite() && isFront && <video ref={vid} src={playable} muted playsInline loop preload="metadata" className={`absolute inset-0 h-full w-full ${vertical ? "object-contain" : "object-cover"}`} />}
        <span className={`absolute inset-0 transition-colors duration-700 ${isFront ? "bg-transparent" : "bg-void/45"}`} />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-void/80 to-transparent" />
        <span className="absolute left-3 top-3"><MarkEmblem className="h-6 w-6" /></span>
        <span className="absolute bottom-3 left-4 right-4 truncate font-label text-[0.55rem] tracking-[0.2em] text-chrome/90">{displayTitle(p.title).toUpperCase()}</span>
      </span>
    </button>
  );
}
