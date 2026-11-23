import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useSiteData } from "@/data/DataProvider";
import { siteProjects, artFor, type SiteProject } from "@/data/placeholders";
import { gsap } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { usePlayer } from "@/components/media/Player";
import { Tags } from "@/components/media/ProjectMedia";
import { useInView } from "@/hooks/useInView";
import { isPlayableUrl, mediaUrl } from "@/lib/media";
import { formatDuration } from "@/lib/utils";
import { displayTitle } from "@/lib/titles";

const pretty = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const RATIO: Record<string, number> = { "16:9": 16 / 9, "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "21:9": 21 / 9 };
type Filter = { discipline: "all" | "ai" | "editing"; category: string | null; originals: boolean };

/**
 * Work: a full-screen reel of every published film. Auto-advances with a transition in each film's own style
 * (liquid circle for AI, diagonal slice for Editing). Controls: previous, pause / play the movement, fast-forward
 * (next film), 2× speed. Thumbnail rail, filters, arrows / space, swipe. Pauses when scrolled away.
 */
export function WorkReel() {
  const data = useSiteData();
  const all = useMemo(() => siteProjects(data.projects), [data.projects]);
  const copy = data.settings.copy.library;
  const [f, setF] = useState<Filter>({ discipline: "all", category: null, originals: false });
  const films = useMemo(() => all.filter((p) => (f.discipline === "all" || p.discipline === f.discipline) && (!f.category || p.category === f.category) && (!f.originals || p.is_xperience_original)), [all, f]);
  const categories = useMemo(() => [...new Set(all.filter((p) => f.discipline === "all" || p.discipline === f.discipline).map((p) => p.category).filter(Boolean))] as string[], [all, f.discipline]);

  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [playing, setPlaying] = useState(!reducedMotion());
  const [fast, setFast] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const timer = useRef<gsap.core.Tween | null>(null);
  const videos = useRef<Map<string, HTMLVideoElement>>(new Map());
  const inView = useInView(stage, "0px");
  const open = usePlayer();
  const n = films.length;
  const cur = films[Math.min(index, Math.max(0, n - 1))];

  useEffect(() => { setIndex(0); setPrev(null); }, [f]);

  const go = useCallback((to: number) => {
    if (!n) return;
    const next = ((to % n) + n) % n;
    setIndex((i) => { if (i !== next) setPrev(i); return next; });
  }, [n]);

  // transition between films
  useEffect(() => {
    if (prev === null || !stage.current) return;
    const el = stage.current.querySelector<HTMLElement>(`[data-slide="${index}"]`);
    const old = stage.current.querySelector<HTMLElement>(`[data-slide="${prev}"]`);
    if (!el) return;
    const ai = films[index]?.discipline === "ai";
    const forward = index > prev || (prev === n - 1 && index === 0);
    if (reducedMotion()) { gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, onComplete: () => setPrev(null) }); return; }
    const tl = gsap.timeline({ onComplete: () => setPrev(null) });
    if (ai) tl.fromTo(el, { clipPath: `circle(0% at ${forward ? 70 : 30}% 50%)` }, { clipPath: `circle(150% at ${forward ? 70 : 30}% 50%)`, duration: 1.15, ease: "cine" });
    else tl.fromTo(el, { clipPath: forward ? "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" : "polygon(0 0, 0 0, 0 100%, 0 100%)" },
      { clipPath: forward ? "polygon(-30% 0, 100% 0, 100% 100%, 0% 100%)" : "polygon(0 0, 130% 0, 100% 100%, 0 100%)", duration: 0.95, ease: "expo.inOut" });
    tl.fromTo(el.querySelector("[data-media]"), { scale: 1.12 }, { scale: 1, duration: 1.4, ease: "expo" }, 0);
    if (old) tl.to(old.querySelector("[data-media]"), { scale: 1.06, opacity: 0.35, duration: 1, ease: "power2.in" }, 0);
    tl.fromTo(stage.current.querySelectorAll("[data-info] > *"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.8, ease: "expo" }, 0.35);
    return () => { tl.kill(); };
  }, [index, prev, films, n]);

  // play the current film's video, pause the rest
  useEffect(() => {
    videos.current.forEach((v, id) => {
      const isCur = id === cur?.id;
      v.playbackRate = fast ? 2 : 1;
      if (isCur && inView) { v.currentTime = Math.min(v.currentTime, 0.01) || 0; v.play().catch(() => {}); } else v.pause();
    });
  }, [cur?.id, inView, fast]);

  // the movement: a timed progress bar that advances to the next film
  useEffect(() => {
    timer.current?.kill();
    if (!cur || !bar.current) return;
    const secs = Math.min(12, Math.max(5, cur.duration_s ?? 8));
    gsap.set(bar.current, { scaleX: 0 });
    timer.current = gsap.to(bar.current, { scaleX: 1, duration: secs, ease: "none", paused: true, onComplete: () => go(index + 1) });
    return () => { timer.current?.kill(); };
  }, [cur, index, go]);
  useEffect(() => {
    const t = timer.current; if (!t) return;
    t.timeScale(fast ? 2 : 1);
    if (playing && inView && n > 1) t.play(); else t.pause();
  }, [playing, inView, fast, n, index]);

  // keyboard (only while the reel is on screen)
  useEffect(() => {
    if (!inView) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.querySelector("[role=dialog]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      else if (e.key === " " && stage.current?.contains(document.activeElement)) { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inView, index, go]);

  // swipe
  const touch = useRef<{ x: number; y: number } | null>(null);

  const update = (patch: Partial<Filter>) => setF((x) => ({ ...x, ...patch }));
  const chip = (label: string, pressed: boolean, onClick: () => void) => (
    <button key={label} type="button" className="chip shrink-0 !bg-void/55 backdrop-blur" aria-pressed={pressed} onClick={onClick}>{label}</button>
  );
  const visible = new Set([index, prev, (index + 1) % Math.max(1, n)]);

  return (
    <section ref={stage} id="library" aria-roledescription="carousel" aria-label={copy.headline} tabIndex={-1}
      className="relative h-dvh min-h-[560px] w-full overflow-hidden bg-void outline-none"
      onPointerDown={(e) => { if (e.pointerType !== "mouse") touch.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const t = touch.current; touch.current = null;
        if (!t) return; const dx = e.clientX - t.x, dy = e.clientY - t.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
      }}>
      {/* slides (only the current, the outgoing and the next are mounted) */}
      {films.map((p, i) => visible.has(i) && (
        <Slide key={p.id} p={p} i={i} active={i === index} preload={i !== index && i !== prev}
          register={(v) => { if (v) videos.current.set(p.id, v); else videos.current.delete(p.id); }}
          zIndex={i === index ? 2 : i === prev ? 1 : 0} />
      ))}
      {n === 0 && <div className="media-placeholder absolute inset-0" />}

      {/* shade for legibility */}
      <div className="pointer-events-none absolute inset-0 z-[3]" style={{ background: [
        "linear-gradient(180deg, rgba(7,6,13,.9) 0%, rgba(7,6,13,.55) 16%, rgba(7,6,13,0) 32%)",
        "linear-gradient(0deg, rgba(7,6,13,.97) 0%, rgba(7,6,13,.88) 22%, rgba(7,6,13,.45) 46%, rgba(7,6,13,0) 64%)",
        "linear-gradient(90deg, rgba(7,6,13,.55) 0%, rgba(7,6,13,0) 55%)",
      ].join(", ") }} />

      {/* top: headline + filters */}
      <div className="absolute inset-x-0 top-0 z-[5] px-[clamp(1.25rem,4vw,4rem)] pt-[calc(var(--nav-h)+0.75rem)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2 flex items-center gap-3"><span className="timecode text-magenta">WORK</span>{copy.sub}</p>
            <h2 className="font-display text-[clamp(1.8rem,4vw,3.4rem)] font-semibold leading-none">{copy.headline}</h2>
          </div>
          <p className="timecode text-sm text-chrome/80" aria-live="polite">{n ? `${String(index + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}` : "00 / 00"}</p>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Filter work">
          {(["all", "ai", "editing"] as const).map((d) => chip(d === "all" ? "All" : d === "ai" ? "AI Video" : "Video Editing", f.discipline === d, () => update({ discipline: d, category: null })))}
          {categories.map((c) => chip(pretty(c), f.category === c, () => update({ category: f.category === c ? null : c })))}
          {chip("Xperience Originals", f.originals, () => update({ originals: !f.originals }))}
        </div>
      </div>

      {/* bottom: info + controls + rail */}
      {cur && (
        <div className="absolute inset-x-0 bottom-0 z-[5] px-[clamp(1.25rem,4vw,4rem)] pb-[clamp(1.25rem,4vh,2.5rem)]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div data-info className="max-w-2xl space-y-3">
              <Tags p={cur} />
              <h3 className="font-display text-[clamp(2rem,5.5vw,4.8rem)] font-semibold leading-[0.95] [text-shadow:0_2px_24px_rgba(7,6,13,.6)]">{displayTitle(cur.title)}</h3>
              {(cur.caption || cur.brief) && <p className="max-w-xl text-chrome/80">{cur.caption || cur.brief}</p>}
              <div className="flex flex-wrap items-center gap-4">
                <button type="button" className="btn btn-primary !py-3" data-cursor="play" aria-label={`Play ${cur.title} with sound`}
                  onClick={(e) => { setPlaying(false); open(cur, e.currentTarget.closest("section")); }}>
                  <Volume2 className="size-4" /> Watch with sound
                </button>
                <span className="timecode text-sm text-ash">{formatDuration(cur.duration_s)}{cur.category ? ` · ${pretty(cur.category)}` : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Reel controls">
              <Ctrl label="Previous film" onClick={() => go(index - 1)}><SkipBack className="size-5" /></Ctrl>
              <Ctrl label={playing ? "Pause the reel" : "Play the reel"} onClick={() => setPlaying((p) => !p)} big>{playing ? <Pause className="size-6" /> : <Play className="size-6" />}</Ctrl>
              <Ctrl label="Fast-forward to the next film" onClick={() => go(index + 1)}><SkipForward className="size-5" /></Ctrl>
              <button type="button" onClick={() => setFast((x) => !x)} aria-pressed={fast} aria-label="Double speed"
                className={`timecode rounded-full border px-3 py-2 text-xs transition ${fast ? "border-magenta bg-magenta/20 text-chrome" : "border-line bg-void/55 text-ash backdrop-blur hover:text-chrome"}`}>2×</button>
            </div>
          </div>
          {/* movement progress */}
          <div className="mt-5 h-[2px] w-full overflow-hidden rounded bg-chrome/15" aria-hidden>
            <div ref={bar} className="h-full origin-left bg-[linear-gradient(90deg,#C84BFF,#7C3AED,#2F6BFF)] shadow-[0_0_12px_#7C3AED]" style={{ transform: "scaleX(0)" }} />
          </div>
          {/* thumbnail rail */}
          {n > 1 && (
            <div className="mt-3 hidden gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex" aria-label="All films">
              {films.map((p, i) => (
                <button key={p.id} type="button" onClick={() => go(i)} aria-label={`Show ${displayTitle(p.title)}`} aria-current={i === index}
                  className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-md border transition ${i === index ? "border-magenta opacity-100" : "border-line opacity-50 hover:opacity-90"}`}>
                  {p.poster_url ? <img src={mediaUrl(p.poster_url)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="block h-full w-full" style={{ background: artFor(p.id, p.discipline) }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Ctrl({ label, onClick, children, big }: { label: string; onClick: () => void; children: React.ReactNode; big?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className={`grid place-items-center rounded-full border border-line bg-void/55 text-chrome backdrop-blur transition hover:border-violet hover:bg-violet/20 ${big ? "h-14 w-14" : "h-11 w-11"}`}>
      {children}
    </button>
  );
}

function Slide({ p, i, active, preload, register, zIndex }: { p: SiteProject; i: number; active: boolean; preload: boolean; register: (v: HTMLVideoElement | null) => void; zIndex: number }) {
  const src = mediaUrl(p.video_url || p.teaser_url);
  const playable = src && isPlayableUrl(src) ? src : undefined;
  const poster = mediaUrl(p.show_caption && p.cover_url ? p.cover_url : p.poster_url);
  // wide films fill the screen; vertical / square ones sit whole on a blurred fill of themselves
  const fit = (RATIO[p.aspect_ratio] ?? 16 / 9) >= 1.3 ? "object-cover" : "object-contain";
  return (
    <div data-slide={i} className="absolute inset-0" style={{ zIndex }} aria-hidden={!active}>
      <div data-media className="absolute inset-0 will-change-transform">
        {poster ? <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
          : <div className="absolute inset-0" style={{ background: artFor(p.id, p.discipline) }} />}
        {playable && <video ref={register} src={playable} poster={poster} muted playsInline loop preload={active ? "auto" : preload ? "metadata" : "none"} className={`absolute inset-0 h-full w-full ${fit}`} />}
        {!playable && poster && <img src={poster} alt="" className={`absolute inset-0 h-full w-full ${fit}`} />}
      </div>
    </div>
  );
}
