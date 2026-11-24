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
    // gradient on the highlighted word goes on the split word itself (background-clip text breaks inside masks)
    split.words.forEach((w) => { if ((w as HTMLElement).querySelector("[data-hl]") || (w as HTMLElement).closest("[data-hl]")) (w as HTMLElement).classList.add("text-gradient"); });
    // Only transforms here (no opacity): the copy counts as painted immediately, which keeps LCP fast
    // even while the Ignition intro plays over it.
    // start the moment the intro finishes (0.8 s on repeat visits), not after a fixed wait
    const tl = gsap.timeline({ paused: true })
      .from(split.words, { yPercent: 115, stagger: 0.05, duration: 1.4, ease: "expo" })
      .from(ref.current!.querySelectorAll("[data-fade]"), { y: 18, stagger: 0.08, duration: 1 }, 0.35);
    const start = () => tl.play();
    if (document.documentElement.classList.contains("is-loading")) window.addEventListener("xp:ignited", start, { once: true });
    else gsap.delayedCall(0.15, start);
    return () => { window.removeEventListener("xp:ignited", start); split.revert(); };
  }, { scope: ref, dependencies: [settings.hero_headline], revertOnUpdate: true });
  return (
    <div ref={ref} className="content max-w-5xl space-y-7">
      <p className="eyebrow flex items-center gap-3" data-fade>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-void/50 px-3 py-1.5 text-chrome/90 backdrop-blur"><span className="size-1.5 rounded-full bg-[#ff3b5c] shadow-[0_0_8px_#ff3b5c]" /> Now booking</span>
        AI Video · Video Editing
      </p>
      <h1 key={settings.hero_headline} className="text-balance text-[clamp(3rem,8.6vw,8.5rem)] font-semibold leading-[0.9] md:max-w-[50vw] md:text-[clamp(3rem,5.4vw,6.6rem)]">
        {(settings.hero_headline ?? "").split(" ").map((w, i, arr) => (
          <span key={i} data-hl={i === 1 && arr.length > 2 ? "" : undefined}>{w}{i < arr.length - 1 ? " " : ""}</span>
        ))}
      </h1>
      <p className="max-w-lg text-lg text-chrome/75" data-fade>{settings.hero_sub}</p>
      <div className="flex flex-wrap gap-3" data-fade>
        <Magnetic><button type="button" onClick={() => scrollToTarget("#library")} className="btn btn-primary" data-cursor="play">{settings.hero_cta_primary}</button></Magnetic>
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
    <section id="top" className="section relative flex min-h-svh flex-col justify-end pb-[12svh] pt-[var(--nav-h)]">
      <SectionMedia sectionKey="hero" />
      <HeroCopy />
    </section>
  );
}
