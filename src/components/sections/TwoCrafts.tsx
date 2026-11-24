import { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useSiteData } from "@/data/DataProvider";
import { gsap, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { SectionMedia } from "@/components/media/SectionMedia";
import { useXWipeNavigate } from "@/components/site/XWipe";
import { useMediaQuery } from "@/hooks/useInView";
import { SectionHeader } from "./SectionHeader";

/** Split screen. Hover widens a side to 70% via clip-path; click goes to /work/:discipline (X-wipe). */
export function TwoCrafts() {
  const { copy } = useSiteData().settings;
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<"ai" | "editing" | null>(null);
  const go = useXWipeNavigate();
  const stacked = useMediaQuery("(max-width: 767px), (hover: none)");

  useGSAP(() => {
    if (stacked) { gsap.set("[data-side]", { clipPath: "none" }); return; }
    const split = hover === "ai" ? 70 : hover === "editing" ? 30 : 50;
    const d = reducedMotion() ? 0 : 0.9;
    gsap.to("[data-side=ai]", { clipPath: `polygon(0 0, ${split + 6}% 0, ${split - 6}% 100%, 0 100%)`, duration: d, ease: "expo" });
    gsap.to("[data-side=editing]", { clipPath: `polygon(${split + 6}% 0, 100% 0, 100% 100%, ${split - 6}% 100%)`, duration: d, ease: "expo" });
    gsap.to("[data-divider]", { left: `${split}%`, duration: d, ease: "expo" });
  }, { scope: root, dependencies: [hover, stacked] });

  const side = (key: "ai" | "editing") => {
    const ai = key === "ai";
    return (
      <a href={`/work/${key}`} data-side={key} data-cursor="open"
        onClick={(e) => { e.preventDefault(); go(`/work/${key}`); }}
        onPointerEnter={() => setHover(key)} onFocus={() => setHover(key)}
        className={`group block outline-none ${stacked ? "relative h-[62svh] overflow-hidden" : "absolute inset-0"}`}
        style={stacked ? undefined : { clipPath: ai ? "polygon(0 0, 56% 0, 44% 100%, 0 100%)" : "polygon(56% 0, 100% 0, 100% 100%, 44% 100%)" }}>
        <SectionMedia sectionKey={ai ? "crafts-ai" : "crafts-editing"} align="center" className="!z-0" />
        <div className={`absolute inset-0 ${ai ? "bg-[radial-gradient(60%_60%_at_25%_50%,rgba(47,107,255,.28),transparent_70%)]" : "bg-[radial-gradient(60%_60%_at_75%_50%,rgba(200,75,255,.26),transparent_70%)]"}`} />
        <div className={`absolute bottom-[12%] flex max-w-sm flex-col gap-4 ${ai || stacked ? "left-[var(--gutter)]" : "right-[var(--gutter)] items-end text-right"}`}>
          <span className={`eyebrow !text-[0.7rem] ${ai ? "!text-electric" : "!text-magenta"}`}>{ai ? "01 · Generate" : "02 · Cut"}</span>
          <h3 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[0.9]">{ai ? "AI Video" : "Video Editing"}</h3>
          <p data-words className="text-chrome/80">{ai ? copy.crafts.ai : copy.crafts.editing}</p>
          <span className={`inline-flex items-center gap-2 font-label text-[0.65rem] tracking-[0.25em] ${ai ? "text-electric" : "text-magenta"}`}>
            SEE THE WORK <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" />
          </span>
        </div>
      </a>
    );
  };

  return (
    <section id="crafts" aria-labelledby="crafts-title" className="relative">
      <div className="section pb-14 pt-32 md:pt-40"><SectionHeader index="04" eyebrow="Two crafts" title={copy.crafts.headline} /></div>
      <div ref={root} className={`content relative overflow-hidden border-y border-line ${stacked ? "" : "h-[82svh] min-h-[560px]"}`} onPointerLeave={() => setHover(null)}>
        {side("ai")}
        {side("editing")}
        {!stacked && <div data-divider aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rotate-[6.8deg] scale-y-125 bg-gradient-to-b from-electric via-violet to-magenta shadow-[0_0_20px_#7C3AED]" />}
      </div>
    </section>
  );
}
