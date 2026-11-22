import { useRef } from "react";
import { useSiteData } from "@/data/DataProvider";
import { gsap, SplitText, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { SectionMedia } from "@/components/media/SectionMedia";

/**
 * Pinned SplitText scrub. The last sentence becomes a knockout text mask over the reel
 * (white text + mix-blend-multiply over the video) and then scales up until the reel fills the screen.
 */
export function Manifesto() {
  const { settings } = useSiteData();
  const text = settings.copy.manifesto.text.trim();
  const parts = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const lead = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const last = parts[parts.length - 1];
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const leadEl = el.querySelector<HTMLElement>("[data-lead]");
    const mask = el.querySelector<HTMLElement>("[data-mask]");
    const maskText = el.querySelector<HTMLElement>("[data-mask-text]");
    if (reducedMotion()) {
      gsap.from(el.querySelectorAll("[data-fade]"), { opacity: 0, duration: 0.8, stagger: 0.2, scrollTrigger: { trigger: el, start: "top 70%" } });
      return;
    }
    const split = leadEl ? SplitText.create(leadEl, { type: "words", aria: "none" }) : null;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top top", end: "+=260%", pin: true, scrub: 1, anticipatePin: 1 },
      defaults: { ease: "none" },
    });
    if (split) tl.fromTo(split.words, { opacity: 0.18, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)", stagger: 0.08, duration: 0.6 });
    if (leadEl) tl.to(leadEl, { yPercent: -60, opacity: 0, duration: 0.6 }, "+=0.2");
    tl.fromTo(maskText, { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, duration: 0.5 }, "<0.1")
      .to(maskText, { scale: 28, duration: 1.6, ease: "power2.in" }, "+=0.3")
      .to(mask, { opacity: 0, duration: 0.4 }, ">-0.35");
    return () => split?.revert();
  }, { scope: root, dependencies: [text], revertOnUpdate: true });

  return (
    // stable wrapper: ScrollTrigger's pin-spacer wraps the section, React keeps owning this div
    <div>
    <section ref={root} id="manifesto" aria-label="Manifesto" className="relative h-dvh overflow-hidden">
      <SectionMedia sectionKey="manifesto" align="center" />
      <div data-mask className="absolute inset-0 z-10 grid place-items-center bg-void mix-blend-multiply">
        <p key={last} data-mask-text data-fade className="px-6 text-center font-display text-[clamp(3rem,11vw,11rem)] font-bold leading-[0.9] text-white will-change-transform" style={{ transformOrigin: "50% 55%" }}>
          {last}
        </p>
      </div>
      <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-6">
        {lead && <p key={lead} data-lead data-fade className="max-w-5xl text-balance text-center font-display text-[clamp(2.2rem,6vw,5.5rem)] font-semibold leading-[1.02]">{lead}</p>}
      </div>
    </section>
    </div>
  );
}
