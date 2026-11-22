import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { XperienceLogo } from "@/components/brand/XperienceLogo";

const Ctx = createContext<(to: string) => void>(() => {});
/** Navigate with the "X-wipe": two blade-shaped panels cross diagonally, the mark flashes centre, panels exit. */
export const useXWipeNavigate = () => useContext(Ctx);

export function XWipeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const go = useCallback((to: string) => {
    if (busy.current) return;
    if (reducedMotion() || !root.current) { navigate(to); window.scrollTo(0, 0); return; }
    busy.current = true;
    const q = gsap.utils.selector(root.current);
    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void; scrollTo(y: number, o: object): void } }).__lenis;
    gsap.timeline({ defaults: { ease: "cine" }, onComplete: () => { busy.current = false; gsap.set(root.current, { visibility: "hidden" }); } })
      .set(root.current, { visibility: "visible" })
      .fromTo(q("[data-blade=a]"), { xPercent: -120, yPercent: -120 }, { xPercent: 0, yPercent: 0, duration: 0.6 })
      .fromTo(q("[data-blade=b]"), { xPercent: 120, yPercent: 120 }, { xPercent: 0, yPercent: 0, duration: 0.6 }, "<0.04")
      .fromTo(q("[data-wipe-mark]"), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "expo" }, "-=0.15")
      .fromTo(q("[data-wipe-flash]"), { opacity: 0.9, scale: 0.2 }, { opacity: 0, scale: 2.5, duration: 0.5, ease: "power2.out" }, "<")
      .add(() => { navigate(to); lenis?.scrollTo(0, { immediate: true, force: true }); window.scrollTo(0, 0); })
      .to(q("[data-wipe-mark]"), { opacity: 0, scale: 1.2, duration: 0.3 }, "+=0.15")
      .to(q("[data-blade=a]"), { xPercent: 120, yPercent: 120, duration: 0.65 }, "<")
      .to(q("[data-blade=b]"), { xPercent: -120, yPercent: -120, duration: 0.65 }, "<0.03");
  }, [navigate]);

  return (
    <Ctx.Provider value={go}>
      {children}
      <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[450] overflow-hidden" style={{ visibility: "hidden" }}>
        <div data-blade="a" className="absolute inset-[-25%] bg-carbon" style={{ clipPath: "polygon(0 0, 62% 0, 100% 38%, 100% 100%, 38% 100%, 0 62%)", background: "linear-gradient(135deg,#100E1A 30%,#1B1828 50%,#100E1A 70%)" }} />
        <div data-blade="b" className="absolute inset-[-25%]" style={{ clipPath: "polygon(38% 0, 100% 0, 100% 62%, 62% 100%, 0 100%, 0 38%)", background: "linear-gradient(225deg,#07060D 30%,#2B2640 50%,#07060D 70%)", mixBlendMode: "screen" }} />
        <div className="absolute inset-0 grid place-items-center">
          <span data-wipe-flash className="absolute h-64 w-64 rounded-full bg-[radial-gradient(circle,#fff,rgba(124,58,237,.6)_30%,transparent_65%)] opacity-0" />
          <XperienceLogo data-wipe-mark variant="mark" className="relative h-28 w-28 opacity-0" />
        </div>
      </div>
    </Ctx.Provider>
  );
}
