import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, Download, Share2 } from "lucide-react";
import { gsap } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { isPlayableUrl, mediaUrl } from "@/lib/media";
import { formatDuration } from "@/lib/utils";
import { artFor, type SiteProject } from "@/data/placeholders";
import { Tags } from "./ProjectMedia";
import { displayTitle } from "@/lib/titles";

type Open = (p: SiteProject, from?: HTMLElement | null) => void;
const Ctx = createContext<Open>(() => {});
export const usePlayer = () => useContext(Ctx);

export function PlayerProvider({ children, projects = [] }: { children: ReactNode; projects?: SiteProject[] }) {
  const [state, setState] = useState<{ p: SiteProject; rect: DOMRect | null; from: HTMLElement | null } | null>(null);
  const open = useCallback<Open>((p, from) => setState({ p, rect: from?.getBoundingClientRect() ?? null, from: from ?? null }), []);
  // shared links (/p/:slug -> /?project=slug) open that film straight away
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !projects.length) return;
    const slug = new URLSearchParams(location.search).get("project");
    const p = slug ? projects.find((x) => x.slug === slug) : null;
    if (p) { opened.current = true; setTimeout(() => setState({ p, rect: null, from: null }), 3200); }
  }, [projects]);
  return (
    <Ctx.Provider value={open}>
      {children}
      {state && createPortal(<PlayerOverlay {...state} onClose={() => setState(null)} />, document.body)}
    </Ctx.Provider>
  );
}

function PlayerOverlay({ p, rect, from, onClose }: { p: SiteProject; rect: DOMRect | null; from: HTMLElement | null; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const src = mediaUrl(p.video_url);
  const playable = src && isPlayableUrl(src);

  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void } }).__lenis;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const f = frame.current!;
    const tl = gsap.timeline();
    if (rect && !reducedMotion()) {
      const end = f.getBoundingClientRect();
      tl.fromTo(f, { x: rect.left - end.left, y: rect.top - end.top, scaleX: rect.width / end.width, scaleY: rect.height / end.height, transformOrigin: "0 0", borderRadius: 18 },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: 8, duration: 0.9, ease: "cine" });
    }
    tl.fromTo(root.current, { backgroundColor: "rgba(7,6,13,0)" }, { backgroundColor: "rgba(7,6,13,0.96)", duration: 0.6 }, 0)
      .fromTo("[data-player-ui]", { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.6 }, 0.45);
    closeBtn.current?.focus();
    video.current?.play().catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      lenis?.start();
      from?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    video.current?.pause();
    gsap.to(root.current, { opacity: 0, duration: 0.35, ease: "power2.out", onComplete: onClose });
  }

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label={p.title} className="fixed inset-0 z-[300] flex flex-col p-4 md:p-8"
      onClick={(e) => { if (e.target === root.current) close(); }}>
      <div className="mb-3 flex items-center justify-between gap-4" data-player-ui>
        <div className="min-w-0">
          <p className="eyebrow">{p.category ?? (p.discipline === "ai" ? "AI Video" : "Video Editing")}</p>
          <h2 className="truncate font-display text-2xl md:text-4xl">{displayTitle(p.title)}</h2>
        </div>
        <button ref={closeBtn} onClick={close} className="btn btn-ghost !p-3" aria-label="Close player" data-cursor="close"><X className="size-5" /></button>
      </div>
      <div ref={frame} className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-black will-change-transform">
        {playable ? (
          <video ref={video} src={src} poster={mediaUrl(p.poster_url)} controls playsInline autoPlay className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-full w-full place-items-center" style={{ background: artFor(p.id, p.discipline) }}>
            <p className="eyebrow !text-chrome">{p.placeholder ? "Placeholder: the film appears here once uploaded" : "Video coming soon"}</p>
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-4 text-sm md:grid-cols-[1fr_auto]" data-player-ui>
        <div className="grid gap-3 md:grid-cols-3">
          {p.brief && <div><p className="eyebrow mb-1">Brief</p><p className="text-chrome/90">{p.brief}</p></div>}
          {p.role && <div><p className="eyebrow mb-1">Role</p><p className="text-chrome/90">{p.role}</p></div>}
          {p.result && <div><p className="eyebrow mb-1">Result</p><p className="text-chrome/90">{p.result}</p></div>}
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <Tags p={p} />
          <span className="timecode text-ash">{formatDuration(p.duration_s)}</span>
          {!p.placeholder && <button type="button" className="inline-flex items-center gap-1.5 text-ash underline-offset-4 hover:text-chrome hover:underline" onClick={async () => {
            const url = `${location.origin}/p/${p.slug}`;
            try { if (navigator.share) await navigator.share({ title: p.title, url }); else { await navigator.clipboard.writeText(url); alert("Link copied"); } } catch { /* cancelled */ }
          }}><Share2 className="size-4" /> Share</button>}
          {p.full_video_url && <a href={p.full_video_url} className="inline-flex items-center gap-1.5 text-ash underline-offset-4 hover:text-chrome hover:underline" target="_blank" rel="noreferrer"><Download className="size-4" /> Full-quality file</a>}
        </div>
      </div>
    </div>
  );
}
