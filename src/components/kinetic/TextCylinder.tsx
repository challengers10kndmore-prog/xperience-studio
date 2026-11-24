import { useEffect, useRef } from "react";
import { gsap } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { isLite } from "@/lib/perf";
import { onVelocity } from "./velocity";

/**
 * Marquee wrapped on a rotating 3D cylinder: items stand around a vertical axis and the drum turns.
 * Scroll velocity speeds it up (and reverses with direction) and tilts the drum; it eases back when you stop.
 */
export function TextCylinder({ items, direction = 1, className = "", itemClassName = "", radius = 900 }: {
  items: string[]; direction?: 1 | -1; className?: string; itemClassName?: string; radius?: number;
}) {
  const drum = useRef<HTMLDivElement>(null);
  const list = items.length ? [...items, ...items, ...items].slice(0, Math.max(14, Math.min(24, items.length * 3))) : ["—"];
  const step = 360 / list.length;
  useEffect(() => {
    const el = drum.current; if (!el) return;
    if (reducedMotion()) return;
    let a = 0, boost = 0, tilt = 0;
    const off = onVelocity((v) => { boost = gsap.utils.clamp(-40, 40, v / 120); tilt = gsap.utils.clamp(-10, 10, v / 400); });
    const lite = isLite();
    const tick = (_t: number, dt: number) => {
      a += direction * ((lite ? 4 : 6) + Math.abs(boost)) * Math.sign(boost || 1) * (dt / 1000);
      el.style.transform = `translateZ(${-radius}px) rotateX(${(-tilt).toFixed(2)}deg) rotateY(${a.toFixed(2)}deg)`;
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); off(); };
  }, [direction, radius]);
  return (
    <div aria-hidden className={`relative h-[1.6em] w-full overflow-hidden [perspective:1400px] ${className}`}>
      <div ref={drum} className="absolute left-1/2 top-0 h-full [transform-style:preserve-3d]" style={{ transform: `translateZ(${-radius}px)` }}>
        {list.map((t, i) => (
          <span key={i} className={`absolute left-0 top-0 -translate-x-1/2 whitespace-nowrap [backface-visibility:hidden] ${itemClassName}`}
            style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px) translateX(-50%)` }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
