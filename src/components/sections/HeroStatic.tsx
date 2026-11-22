import { useRef } from "react";
import { useSiteData } from "@/data/DataProvider";
import { NavMark } from "@/components/brand/NavMark";
import { SectionMedia } from "@/components/media/SectionMedia";
import { gsap, SplitText, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { scrollToTarget } from "@/motion/SmoothScroll";
import { Magnetic } from "@/motion/Magnetic";

/** Hero copy layer (shared by the static hero and "The Assembly"). */
export function HeroCopy() {
  const { settings } = useSiteData();
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const h = ref.current!.querySelector("h1")!;
    if (reducedMotion()) return;
    const split = SplitText.create(h, { type: "lines,words", mask: "lines" });
    // Only transforms here (no opacity): the copy counts as painted immediately, which keeps LCP fast
    // even while the Ignition intro plays over it.
    gsap.timeline({ delay: document.documentElement.classList.contains("is-loading") ? 2.9 : 0.2 })
      .from(split.words, { yPercent: 115, stagger: 0.05, duration: 1.4, ease: "expo" })
      .from(ref.current!.querySelectorAll("[data-fade]"), { y: 18, stagger: 0.08, duration: 1 }, 0.35);
    return () => split.revert();
  }, { scope: ref, dependencies: [settings.hero_headline], revertOnUpdate: true });
  return (
    <div ref={ref} className="content max-w-5xl space-y-7">
      <p className="eyebrow" data-fade>AI Video · Video Editing</p>
      <h1 key={settings.hero_headline} className="text-balance text-[clamp(3rem,8.6vw,8.5rem)] font-semibold md:max-w-[62vw] md:text-[clamp(3rem,6.6vw,8rem)]">{settings.hero_headline}</h1>
      <p className="max-w-xl text-lg text-chrome/75" data-fade>{settings.hero_sub}</p>
      <div className="flex flex-wrap gap-3" data-fade>
        <Magnetic><button type="button" onClick={() => scrollToTarget("#work")} className="btn btn-primary" data-cursor="play">{settings.hero_cta_primary}</button></Magnetic>
        <Magnetic><button type="button" onClick={() => scrollToTarget("#contact")} className="btn btn-ghost">{settings.hero_cta_secondary}</button></Magnetic>
      </div>
      <p className="flex items-center gap-2.5 text-sm text-ash" data-fade>
        <NavMark className="h-6 w-6" /> {settings.credit_line}
      </p>
    </div>
  );
}

/** Fallback hero (no WebGL / low GPU tier / reduced motion): section loop + copy. */
export function HeroStatic() {
  return (
    <section id="top" className="section relative flex min-h-dvh flex-col justify-end pb-[12vh] pt-[var(--nav-h)]">
      <SectionMedia sectionKey="hero" />
      <HeroCopy />
    </section>
  );
}
