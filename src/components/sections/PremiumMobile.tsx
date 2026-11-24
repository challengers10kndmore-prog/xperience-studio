import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SiteProject } from "@/data/placeholders";
import { ProjectMedia, Tags } from "@/components/media/ProjectMedia";
import { usePlayer } from "@/components/media/Player";
import { gsap } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { formatDuration } from "@/lib/utils";
import { displayTitle } from "@/lib/titles";
import { RollText } from "@/components/kinetic/RollText";

/**
 * Premium on phones: a vertical, swipeable reel. Each film fills the screen and snaps; the active one plays and its
 * info animates in; a rail shows progress. Swiping past the last film continues down the page (scroll chaining).
 */
export function PremiumMobile({ films }: { films: SiteProject[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const open = usePlayer();
  useEffect(() => {
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.i));
    }, { root: el, threshold: [0.6] });
    el.querySelectorAll("[data-i]").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [films.length]);
  useEffect(() => {
    const card = box.current?.querySelector<HTMLElement>(`[data-i="${active}"]`); if (!card) return;
    if (reducedMotion()) return;
    const tl = gsap.timeline();
    tl.fromTo(card.querySelector("[data-media]"), { scale: 1.12, filter: "brightness(.6)" }, { scale: 1, filter: "brightness(1)", duration: 1.2, ease: "expo" })
      .fromTo(card.querySelectorAll("[data-info] > *"), { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.8, ease: "expo" }, 0.1);
    return () => { tl.kill(); };
  }, [active]);
  return (
    <div className="relative">
      <div ref={box} data-lenis-prevent className="h-svh snap-y snap-mandatory overflow-y-auto overscroll-y-auto [scrollbar-width:none]" aria-label="Selected films, swipe up for the next">
        {films.map((p, i) => (
          <article key={p.id} data-i={i} className="relative h-svh snap-start overflow-hidden">
            <div data-media className="absolute inset-0"><ProjectMedia p={p} play={i === active} /></div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,6,13,.7)_0%,rgba(7,6,13,0)_28%,rgba(7,6,13,.2)_50%,rgba(7,6,13,.95)_100%)]" />
            <div data-info className="safe-bottom absolute inset-x-0 bottom-0 space-y-3 px-[var(--gutter)] pb-8">
              <p className="timecode text-sm text-magenta">CH {String(i + 1).padStart(2, "0")} / {String(films.length).padStart(2, "0")}</p>
              <h3 className="font-display text-[clamp(2.1rem,9vw,3.2rem)] font-semibold leading-[0.95]">{displayTitle(p.title)}</h3>
              {(p.brief || p.caption) && <p className="text-chrome/80">{p.brief || p.caption}</p>}
              <Tags p={p} />
              <div className="flex items-center gap-4 pt-1">
                <button type="button" className="btn btn-primary" onClick={(e) => open(p, e.currentTarget)} aria-label={`Play ${p.title}`}><RollText>Watch</RollText></button>
                <span className="timecode text-sm text-ash">{formatDuration(p.duration_s)}</span>
              </div>
            </div>
            {i === 0 && films.length > 1 && <ChevronDown aria-hidden className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] left-1/2 size-5 -translate-x-1/2 animate-bounce text-chrome/70" />}
          </article>
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {films.map((p, i) => <span key={p.id} className={`block w-[3px] rounded-full transition-all duration-500 ${i === active ? "h-8 bg-magenta shadow-[0_0_10px_#C84BFF]" : "h-4 bg-chrome/30"}`} />)}
      </div>
      <a href="#crafts" className="absolute right-[var(--gutter)] top-4 grid min-h-11 place-items-center rounded-full border border-line bg-void/60 px-4 font-label text-[0.55rem] tracking-[0.2em] text-ash backdrop-blur"
        onClick={(e) => { e.preventDefault(); const s = box.current?.closest("section"); if (s) window.scrollTo({ top: s.getBoundingClientRect().bottom + scrollY, behavior: "smooth" }); }}>SKIP</a>
    </div>
  );
}
