import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { XperienceLogo } from "./XperienceLogo";

/** Nav mark: ring turns once a minute, glint every 8 s; hover parts the blades, brightens the glow, speeds the ring. */
export const NavMark = forwardRef<SVGSVGElement, { className?: string }>(function NavMark({ className = "h-10 w-10" }, ref) {
  const svg = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => svg.current as SVGSVGElement);
  useGSAP(() => {
    const el = svg.current!;
    if (reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const ring = gsap.to(q("[data-part=ring]"), { rotation: 360, svgOrigin: "200 200", duration: 60, ease: "none", repeat: -1 });
    const glint = gsap.timeline({ repeat: -1, repeatDelay: 8 })
      .fromTo(q("[data-part=sweep]"), { x: -160, opacity: 1 }, { x: 560, duration: 0.9, ease: "power2.inOut" })
      .set(q("[data-part=sweep]"), { opacity: 0 });
    const host = el.closest("a") ?? el;
    const enter = () => {
      gsap.to(ring, { timeScale: 12, duration: 0.6 });
      gsap.to(q("[data-part=blade-left]"), { x: -14, y: -4, duration: 0.5, ease: "expo" });
      gsap.to(q("[data-part=blade-right]"), { x: 14, y: -4, duration: 0.5, ease: "expo" });
      gsap.to(q("[data-part=ring]"), { filter: "brightness(1.6) drop-shadow(0 0 10px #7C3AED)", duration: 0.4 });
    };
    const leave = () => {
      gsap.to(ring, { timeScale: 1, duration: 1.2 });
      gsap.to(q("[data-part=blade-left], [data-part=blade-right]"), { x: 0, y: 0, duration: 0.7, ease: "expo" });
      gsap.to(q("[data-part=ring]"), { filter: "brightness(1) drop-shadow(0 0 0px #7C3AED)", duration: 0.6 });
    };
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("focus", enter);
    host.addEventListener("blur", leave);
    return () => { glint.kill(); host.removeEventListener("pointerenter", enter); host.removeEventListener("pointerleave", leave); host.removeEventListener("focus", enter); host.removeEventListener("blur", leave); };
  });
  return <XperienceLogo ref={svg} variant="mark" className={className} title="Xperience" />;
});
