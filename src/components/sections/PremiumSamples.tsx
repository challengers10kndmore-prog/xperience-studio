import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { useSiteData } from "@/data/DataProvider";
import { premiumOf, siteProjects, type SiteProject } from "@/data/placeholders";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { ProjectMedia, Tags } from "@/components/media/ProjectMedia";
import { usePlayer } from "@/components/media/Player";
import { useWebGL } from "@/three/webgl";
import { formatDuration } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

const PremiumGL = lazy(() => import("@/three/PremiumGL"));

/**
 * Pinned full-screen chapters with snap. Between films: WebGL displacement (liquid for AI, slice-cut for Editing);
 * without WebGL, a CSS clip-path wipe with the same character. Click opens the full player (Flip).
 */
export function PremiumSamples() {
  const data = useSiteData();
  const films = useMemo(() => premiumOf(siteProjects(data.projects)), [data.projects]);
  const copy = data.settings.copy.premium;
  const stage = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const openPlayer = usePlayer();
  const gl = useWebGL();
  const useGL = gl.enabled && films.length > 1;
  const n = films.length;

  useGSAP(() => {
    if (n < 1) return;
    const el = stage.current!;
    const layers = gsap.utils.toArray<HTMLElement>("[data-layer]", el);
    const infos = gsap.utils.toArray<HTMLElement>("[data-info]", el);
    gsap.set(infos.slice(1), { autoAlpha: 0, y: 30 });
    const reduced = reducedMotion();
    if (!useGL) layers.forEach((l, i) => i > 0 && gsap.set(l, { clipPath: films[i].discipline === "ai" ? "circle(0% at 50% 50%)" : "polygon(0 0, 0 0, 0 100%, 0 100%)" }));
    const st = ScrollTrigger.create({
      trigger: el, start: "top top", end: () => `+=${Math.max(1, n - 1) * window.innerHeight * 1.1}`,
      pin: true, scrub: reduced ? false : 0.6, anticipatePin: 1,
      snap: n > 1 ? { snapTo: 1 / (n - 1), duration: { min: 0.3, max: 0.9 }, delay: 0.05, ease: "power2.inOut" } : undefined,
      onUpdate(self) {
        const s = self.progress * (n - 1);
        progress.current = s;
        const idx = Math.round(s);
        setActive((a) => (a === idx ? a : idx));
        if (!useGL) {
          layers.forEach((l, i) => {
            if (i === 0) return;
            const p = gsap.utils.clamp(0, 1, s - (i - 1));
            const ai = films[i].discipline === "ai";
            l.style.clipPath = ai ? `circle(${p * 150}% at 50% 50%)` : `polygon(0 0, ${p * 130}% 0, ${p * 130 - 30}% 100%, 0 100%)`;
            l.style.filter = ai && !reduced ? `blur(${(1 - p) * 12}px)` : "";
          });
        }
      },
    });
    return () => st.kill();
  }, { dependencies: [n, useGL], revertOnUpdate: true });

  useGSAP(() => {
    const infos = gsap.utils.toArray<HTMLElement>("[data-info]", stage.current!);
    infos.forEach((el, i) => gsap.to(el, { autoAlpha: i === active ? 1 : 0, y: i === active ? 0 : i < active ? -30 : 30, duration: 0.7, ease: "expo", overwrite: true }));
    videos.current.forEach((v, i) => { if (!v) return; if (Math.abs(i - active) <= 1) v.play().catch(() => {}); else v.pause(); });
  }, { dependencies: [active] });

  if (n === 0) return null;
  return (
    <section id="work" aria-labelledby="premium-title" className="relative">
      <div className="section pb-16 pt-32 md:pt-44">
        <SectionHeader index="03" eyebrow="Premium samples" title={copy.headline} sub={copy.sub} />
      </div>
      <div ref={stage} className="relative h-dvh w-full overflow-hidden bg-void" aria-roledescription="carousel" aria-label="Selected films">
        {films.map((p, i) => (
          <div key={p.id} data-layer className="absolute inset-0" style={{ zIndex: i, opacity: useGL ? 0 : 1 }} aria-hidden={i !== active}>
            <ProjectMedia p={p} ref={(v) => { videos.current[i] = v; }} play={Math.abs(i - active) <= 1} />
          </div>
        ))}
        {useGL && (
          <Suspense fallback={null}>
            <PremiumGL films={films} videos={videos} progress={progress} />
          </Suspense>
        )}
        <div className="pointer-events-none absolute inset-0 z-[20] bg-[linear-gradient(90deg,rgba(7,6,13,.85)_0%,rgba(7,6,13,.35)_45%,rgba(7,6,13,.1)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[20] h-1/2 bg-gradient-to-t from-void/90 to-transparent" />
        <button type="button" className="absolute inset-0 z-[25] cursor-pointer" data-cursor="play" aria-label={`Play ${films[active]?.title}`}
          onClick={() => openPlayer(films[active], stage.current)} />
        <div className="pointer-events-none absolute inset-0 z-30">
          {films.map((p, i) => <ChapterInfo key={p.id} p={p} i={i} n={n} />)}
          <div className="absolute right-[clamp(1.25rem,4vw,4rem)] top-1/2 flex -translate-y-1/2 flex-col gap-3" aria-hidden>
            {films.map((p, i) => <span key={p.id} className={`block h-8 w-[2px] rounded-full transition-all duration-500 ${i === active ? "bg-magenta shadow-[0_0_12px_#C84BFF]" : "bg-line"}`} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChapterInfo({ p, i, n }: { p: SiteProject; i: number; n: number }) {
  return (
    <div data-info className="absolute inset-x-0 bottom-0 grid gap-8 p-[clamp(1.25rem,4vw,4rem)] pb-[clamp(2rem,6vh,4rem)] md:grid-cols-[1.3fr_1fr] md:items-end">
      <div className="max-w-2xl">
        <p className="timecode mb-3 text-sm text-magenta">CH {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</p>
        <h3 className="font-display text-[clamp(2.4rem,6vw,5.5rem)] font-semibold leading-[0.92]">{p.title}</h3>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          {p.brief && <div><dt className="eyebrow mb-1">Brief</dt><dd className="text-chrome/85">{p.brief}</dd></div>}
          {p.role && <div><dt className="eyebrow mb-1">Role</dt><dd className="text-chrome/85">{p.role}</dd></div>}
          {p.result && <div><dt className="eyebrow mb-1">Result</dt><dd className="text-chrome/85">{p.result}</dd></div>}
        </dl>
      </div>
      <div className="flex flex-col items-start gap-3 md:items-end md:text-right">
        <Tags p={p} className="md:justify-end" />
        <p className="timecode text-ash">RUNTIME {formatDuration(p.duration_s)}</p>
        {p.tools.length > 0 && <p className="text-xs text-ash">{p.tools.join(" · ")}</p>}
      </div>
    </div>
  );
}
