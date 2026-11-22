import { useEffect, useRef, useState } from "react";
import { gsap } from "./gsap";
import { hasFinePointer, useReducedMotion } from "./useReducedMotion";

/**
 * Custom cursor. Elements opt in with data-cursor="play|drag|view|open".
 * Hidden on touch devices and for reduced motion (native cursor stays).
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => { setEnabled(hasFinePointer() && !reduced); }, [reduced]);

  useEffect(() => {
    if (!enabled || !dot.current || !ring.current) return;
    document.documentElement.classList.add("has-cursor");
    const xd = gsap.quickTo(dot.current, "x", { duration: 0.12, ease: "power3" });
    const yd = gsap.quickTo(dot.current, "y", { duration: 0.12, ease: "power3" });
    const xr = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const yr = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });
    const move = (e: PointerEvent) => {
      xd(e.clientX); yd(e.clientY); xr(e.clientX); yr(e.clientY);
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]");
      setLabel(el?.dataset.cursor ?? document.body.dataset.cursorHint ?? null);
    };
    const leave = () => gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.2 });
    const enter = () => gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.2 });
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("pointerenter", enter);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerenter", enter);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[400]">
      <div ref={ring} className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className={`grid place-items-center rounded-full border transition-[width,height,background-color,border-color] duration-300 ease-[var(--ease-expo)] ${label ? "h-20 w-20 border-transparent bg-chrome/95" : "h-9 w-9 border-chrome/40"}`}>
          {label && <span className="font-label text-[0.55rem] tracking-[0.2em] text-void">{label.toUpperCase()}</span>}
        </div>
      </div>
      <div ref={dot} className={`absolute left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-magenta transition-opacity ${label ? "opacity-0" : ""}`} />
    </div>
  );
}
