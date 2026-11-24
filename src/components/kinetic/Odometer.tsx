import { useRef } from "react";
import { gsap, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";

const R_EM = 0.5 / Math.tan(Math.PI / 10); // radius of a 10-face drum with 1em faces

/**
 * Stats as a 3D odometer: every digit is a drum of ten faces that rolls to its value and settles with a slight
 * overshoot, the drums staggered right-to-left like a real counter. Non-digits sit still.
 */
export function Odometer({ value, className = "" }: { value: string; className?: string }) {
  const root = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const drums = gsap.utils.toArray<HTMLElement>("[data-drum]", root.current!);
    const st = { trigger: root.current, start: "top 88%", once: true };
    drums.forEach((d, i) => {
      const target = Number(d.dataset.digit);
      const turns = 2 + (drums.length - i); // the right-most digit spins the most
      if (reducedMotion()) { gsap.set(d, { rotateX: target * 36 }); return; }
      gsap.fromTo(d, { rotateX: 0 }, { rotateX: target * 36 + turns * 360, duration: 1.6 + i * 0.12, ease: "back.out(1.35)", scrollTrigger: st });
    });
    gsap.from(root.current!.querySelectorAll("[data-static]"), { opacity: 0, y: "0.4em", duration: 0.6, delay: 1, scrollTrigger: st });
  }, { scope: root, dependencies: [value] });
  return (
    <span ref={root} aria-label={value} className={`inline-flex items-start leading-none [perspective:600px] ${className}`}>
      {[...value].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} aria-hidden className="relative inline-block h-[1em] w-[0.66em] [mask-image:linear-gradient(180deg,transparent,#000_24%,#000_76%,transparent)]" style={{ lineHeight: 1 }}>
            <span className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `translateZ(${-R_EM}em)` }}>
              <span data-drum data-digit={ch} className="absolute inset-0 [transform-style:preserve-3d]">
                {Array.from({ length: 10 }, (_, d) => (
                  <span key={d} className="absolute inset-0 grid place-items-center [backface-visibility:hidden]"
                    style={{ transform: `rotateX(${-d * 36}deg) translateZ(${R_EM}em)` }}>{d}</span>
                ))}
              </span>
            </span>
          </span>
        ) : <span key={i} data-static aria-hidden className="inline-block h-[1em] leading-none">{ch === " " ? " " : ch}</span>,
      )}
    </span>
  );
}
