import { useRef } from "react";
import { gsap, Flip, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { XperienceLogo } from "./XperienceLogo";
import { isLite } from "@/lib/perf";

const VISITED = "xp-visited";
/** Read once per page load (StrictMode runs effects twice; the flag must not flip between runs). */
const repeatVisit = (() => {
  try { const v = localStorage.getItem(VISITED) === "1"; localStorage.setItem(VISITED, "1"); return v; } catch { return false; }
})();

/**
 * Preloader "Ignition" (~2.8 s): ring line-draw, chrome blades slice in from opposite corners and cross with a flash,
 * shockwave ripple, light sweep on the metal, XPERIENCE resolves from scrambled glyphs (magenta -> silver), GAME tracks in,
 * tagline types with pulsing dots, then the mark Flips into the nav. Click to skip; 0.8 s on repeat visits.
 */
export function Ignition({ onDone, replay = false }: { onDone: () => void; replay?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const mark = useRef<SVGSVGElement>(null);
  const words = useRef<SVGSVGElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    const q = gsap.utils.selector(root.current);
    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void } }).__lenis;
    lenis?.stop();
    const repeat = !replay && repeatVisit;

    const finish = () => { lenis?.start(); document.documentElement.classList.remove("is-loading"); window.dispatchEvent(new Event("xp:ignited")); onDone(); };

    if (reducedMotion()) {
      tlRef.current = gsap.timeline({ onComplete: finish }).from(root.current!.querySelector("[data-stage]"), { opacity: 0, duration: 0.4 }).to(root.current, { opacity: 0, duration: 0.4, delay: 0.3 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "expo" }, onComplete: finish });
    tlRef.current = tl;
    tl.set(q("[data-part=ring]"), { drawSVG: "0%" })
      .set(q("[data-part=blade-left]"), { x: -520, y: 520, opacity: 0 })
      .set(q("[data-part=blade-right]"), { x: 520, y: -520, opacity: 0 })
      .set(q("[data-part=word-xperience]"), { fill: "#C84BFF", opacity: 0 })
      .set(q("[data-part=word-game]"), { letterSpacing: "2.2em", opacity: 0 })
      .set(q("[data-part=rule-left], [data-part=rule-right]"), { scaleX: 0, transformOrigin: "50% 50%" })
      .set(q("[data-part=tag-word], [data-part=tag-dot]"), { opacity: 0 })
      .set(q("[data-part=flash]"), { opacity: 0 })
      .set(q("[data-shock]"), { opacity: 0 })
      .set(q("[data-part=sweep]"), { opacity: 0 })
      // ring draws
      .to(q("[data-part=ring]"), { drawSVG: "100%", duration: 0.9, ease: "power2.inOut" }, 0)
      // blades slice in and cross
      .to(q("[data-part=blade-left]"), { x: 0, y: 0, opacity: 1, duration: 0.55, ease: "power4.in" }, 0.35)
      .to(q("[data-part=blade-right]"), { x: 0, y: 0, opacity: 1, duration: 0.55, ease: "power4.in" }, 0.35)
      // flash + shockwave
      .fromTo(q("[data-part=flash]"), { attr: { r: 4 }, opacity: 1 }, { attr: { r: 160 }, opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, 0.9)
      .fromTo(q("[data-shock]"), { scale: 0.2, opacity: 0.9 }, { scale: 3.2, opacity: 0, duration: 1.1, ease: "power2.out", immediateRender: false }, 0.9)
      .to(q("[data-stage]"), { keyframes: { x: [-5, 4, -3, 2, 0] }, duration: 0.35, ease: "none" }, 0.9)
      // light sweep across the metal
      .fromTo(q("[data-part=sweep]"), { x: -160, opacity: 1 }, { x: 560, duration: 0.8, ease: "power2.inOut", immediateRender: false }, 1.15)
      // wordmark
      .to(q("[data-part=word-xperience]"), { opacity: 1, duration: 0.2 }, 1.1)
      .to(q("[data-part=word-xperience]"), { scrambleText: { text: "XPERIENCE", chars: "XΞ#%&@01<>/\\", speed: 0.8, revealDelay: 0.25 }, duration: 0.8, ease: "none" }, 1.1)
      .to(q("[data-part=word-xperience]"), { fill: "#E6E8EE", duration: 0.6, ease: "power1.out" }, 1.55)
      .to(q("[data-part=word-game]"), { letterSpacing: "0.5em", opacity: 1, duration: 0.9 }, 1.45)
      .to(q("[data-part=rule-left], [data-part=rule-right]"), { scaleX: 1, duration: 0.7 }, 1.6)
      .to(q("[data-part=tag-word]"), { opacity: 1, duration: 0.05, stagger: 0.16, ease: "none" }, 1.8)
      .to(q("[data-part=tag-dot]"), { opacity: 1, duration: 0.2, repeat: 3, yoyo: true, stagger: 0.1, ease: "sine.inOut" }, 1.9)
      .set(q("[data-part=tag-dot]"), { opacity: 1 }, 2.4)
      // hand-off: words fade, mark Flips into the nav
      .to(words.current, { opacity: 0, y: 10, duration: 0.25, ease: "power2.in" }, 2.3)
      .add(() => {
        const target = document.querySelector<SVGSVGElement>("[data-nav-mark]");
        if (!target || !mark.current) return;
        Flip.fit(mark.current, target, { duration: 0.75, ease: "cine", absolute: true });
      }, 2.55)
      .to(root.current, { backgroundColor: "rgba(7,6,13,0)", duration: 0.6, ease: "power2.inOut" }, 2.55)
      .set(root.current, { opacity: 0 }, 3.25);

    // first visit ~2.3 s (was 2.8), repeat visits and low-spec devices 0.8 s
    if (repeat || isLite()) tl.timeScale(tl.duration() / 0.8);
    else tl.timeScale(1.2);
    return () => { lenis?.start(); };
  });

  const skip = () => { const tl = tlRef.current; if (tl && tl.progress() < 0.8) tl.timeScale(8); };

  return (
    <div ref={root} className="fixed inset-0 z-[500] grid cursor-pointer place-items-center overflow-hidden bg-void" onClick={skip} role="presentation" aria-hidden>
      <div data-stage className="relative flex w-[min(320px,64vw)] flex-col items-center">
        <span data-shock className="pointer-events-none absolute left-1/2 top-[calc(min(320px,64vw)/2)] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet opacity-0 shadow-[0_0_40px_#7C3AED]" />
        <XperienceLogo ref={mark} variant="mark" className="w-full" />
        <XperienceLogo ref={words} variant="wordmark" className="-mt-[2%] w-full" />
      </div>
      <p className="absolute bottom-8 font-label text-[0.55rem] tracking-[0.3em] text-ash/70">CLICK TO SKIP</p>
    </div>
  );
}
