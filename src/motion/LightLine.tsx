import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";
import { reducedMotion } from "./useReducedMotion";

/** The logo's glowing underline, drawn across between sections on enter. */
export function LightLine({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current) return;
    if (reducedMotion()) { gsap.set(ref.current, { scaleX: 1, opacity: 0.8 }); return; }
    gsap.fromTo(ref.current, { scaleX: 0, opacity: 0.2 }, {
      scaleX: 1, opacity: 1, duration: 1.6, ease: "expo",
      scrollTrigger: { trigger: ref.current, start: "top 92%", toggleActions: "play none none reverse" },
    });
  });
  return <div aria-hidden className={`mx-[clamp(1.25rem,4vw,4rem)] ${className}`}><div ref={ref} className="light-line" /></div>;
}
