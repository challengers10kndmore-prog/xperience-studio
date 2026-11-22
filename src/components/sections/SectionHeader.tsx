import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";

/** Eyebrow + headline (SplitText line/char reveal) + sub. */
export function SectionHeader({ index, eyebrow, title, sub, className = "", align = "left" }: {
  index?: string; eyebrow: string; title: string; sub?: string; className?: string; align?: "left" | "center";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const root = ref.current!;
    const h = root.querySelector("h2")!;
    const rest = root.querySelectorAll("[data-reveal]");
    if (reducedMotion()) { gsap.from([h, ...rest], { opacity: 0, duration: 0.6, scrollTrigger: { trigger: root, start: "top 85%" } }); return; }
    const split = SplitText.create(h, { type: "lines,words", mask: "lines", linesClass: "pb-[0.08em]" });
    const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: "top 80%" } });
    tl.from(split.words, { yPercent: 110, duration: 1.2, stagger: 0.04, ease: "expo" })
      .from(rest, { opacity: 0, y: 16, duration: 0.9, stagger: 0.08 }, 0.2);
    return () => split.revert();
  }, { scope: ref, dependencies: [title] });
  return (
    <div ref={ref} className={`content max-w-5xl ${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      <p className="eyebrow mb-5 flex items-center gap-3" data-reveal style={align === "center" ? { justifyContent: "center" } : undefined}>
        {index && <span className="timecode text-[0.7rem] tracking-normal text-magenta">{index}</span>}{eyebrow}
      </p>
      <h2 className="section-title text-balance">{title}</h2>
      {sub && <p className="mt-6 max-w-xl text-lg text-ash" data-reveal style={align === "center" ? { marginInline: "auto" } : undefined}>{sub}</p>}
    </div>
  );
}
