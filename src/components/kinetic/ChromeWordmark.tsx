import { useRef } from "react";
import { gsap, useGSAP } from "@/motion/gsap";
import { hasFinePointer, reducedMotion } from "@/motion/useReducedMotion";

/** Footer wordmark: extruded chrome letters that rise one by one and tilt toward the cursor. */
export function ChromeWordmark({ text = "XPERIENCE", className = "" }: { text?: string; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const letters = gsap.utils.toArray<HTMLElement>("[data-l]", root.current!);
    if (reducedMotion()) { gsap.from(root.current, { opacity: 0, duration: 0.8, scrollTrigger: { trigger: root.current, start: "top 90%" } }); return; }
    gsap.from(letters, { yPercent: 110, rotateX: -85, opacity: 0, transformOrigin: "50% 100%", stagger: 0.07, duration: 1.3, ease: "expo", scrollTrigger: { trigger: root.current, start: "top 92%", once: true } });
    if (!hasFinePointer()) return;
    const ry = gsap.quickTo(root.current!.querySelector("[data-tilt]"), "rotateY", { duration: 1, ease: "power3" });
    const rx = gsap.quickTo(root.current!.querySelector("[data-tilt]"), "rotateX", { duration: 1, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = root.current!.getBoundingClientRect(); if (r.top > innerHeight || r.bottom < 0) return;
      ry(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 18); rx(-((e.clientY - (r.top + r.height / 2)) / innerHeight) * 14);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, { scope: root });
  return (
    <div ref={root} aria-label={text} role="img" className={`[perspective:900px] ${className}`}>
      <div data-tilt className="flex justify-center [transform-style:preserve-3d]">
        {[...text].map((c, i) => <span key={i} data-l aria-hidden className="chrome-letter inline-block">{c}</span>)}
      </div>
    </div>
  );
}
