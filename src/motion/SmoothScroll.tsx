import { useEffect, type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { gsap, ScrollTrigger } from "./gsap";
import { useReducedMotion } from "./useReducedMotion";

/** Lenis driven by GSAP's ticker so ScrollTrigger and smooth scroll share one clock. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.4, anchors: { offset: -64 } }}>
      <LenisSync />
      {children}
    </ReactLenis>
  );
}

function LenisSync() {
  const lenis = useLenis(() => ScrollTrigger.update());
  useEffect(() => {
    if (!lenis) return;
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;
    return () => gsap.ticker.remove(tick);
  }, [lenis]);
  return null;
}

export function scrollToTarget(target: string | HTMLElement) {
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: string | HTMLElement, o?: object) => void } }).__lenis;
  if (lenis) lenis.scrollTo(target, { offset: -40, duration: 1.4 });
  else (typeof target === "string" ? document.querySelector(target) : target)?.scrollIntoView({ behavior: "smooth" });
}
