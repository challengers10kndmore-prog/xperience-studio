import { createElement, useRef, type ReactNode } from "react";
import { gsap, SplitText, useGSAP } from "@/motion/gsap";
import { hasFinePointer, reducedMotion } from "@/motion/useReducedMotion";
import { isLite } from "@/lib/perf";
import { velocitySkew } from "./velocity";

type Props = { as?: "h1" | "h2" | "h3" | "p"; children: string; className?: string; id?: string; depth?: number; delay?: number; trigger?: "scroll" | "mount" };

/**
 * Section headings in real 3D:
 *  1. lines flip up into place (rotateX -90 -> 0, perspective 800, masked, staggered);
 *  2. then sit with depth: stacked layers offset in Z (a violet extrusion) that parallax as the heading tilts;
 *  3. a brand-gradient light sweep crosses the letters (a transformed window over a gradient copy: compositor only);
 *  4. the heading tilts toward the cursor (+/-6 deg) and skews/stretches with scroll velocity, springing back.
 * Screen readers get the plain text (aria-label); every visual copy is aria-hidden. Reduced motion: fade.
 */
export function KineticHeading({ as = "h2", children, className = "", id, depth = 5, delay = 0, trigger = "scroll" }: Props) {
  const root = useRef<HTMLElement>(null);
  const text = children;
  const layers = isLite() ? 2 : depth;

  useGSAP(() => {
    const el = root.current!;
    const front = el.querySelector<HTMLElement>("[data-front]")!;
    const ext = el.querySelectorAll<HTMLElement>("[data-ext]");
    const sweep = el.querySelector<HTMLElement>("[data-sweep]");
    const sweepInner = el.querySelector<HTMLElement>("[data-sweep-inner]");
    const tilt = el.querySelector<HTMLElement>("[data-tilt]")!;
    const skewEl = el.querySelector<HTMLElement>("[data-skew]")!;
    const st = trigger === "scroll" ? { trigger: el, start: "top 85%", once: true } : undefined;
    if (reducedMotion()) { gsap.from(el, { opacity: 0, duration: 0.6, scrollTrigger: st }); gsap.set(ext, { opacity: 1 }); return; }

    const split = SplitText.create(front, { type: "lines", mask: "lines", aria: "none" });
    gsap.set(ext, { opacity: 0 });
    const tl = gsap.timeline({ delay, scrollTrigger: st });
    tl.from(split.lines, { rotateX: -90, yPercent: 60, transformOrigin: "50% 100% -0.3em", opacity: 0, stagger: 0.12, duration: 1.1, ease: "expo" })
      .to(ext, { opacity: (i: number) => 1 - i / (layers + 1), stagger: 0.04, duration: 0.6, ease: "power2.out" }, "-=0.5");
    if (sweep && sweepInner) {
      // window slides left -> right while its content slides right -> left: the gradient letters stay put, the light moves
      tl.fromTo(sweep, { xPercent: -110 }, { xPercent: 110, duration: 1.4, ease: "power2.inOut" }, "-=0.35")
        .fromTo(sweepInner, { xPercent: 110 }, { xPercent: -110, duration: 1.4, ease: "power2.inOut" }, "<");
    }
    const offV = velocitySkew(skewEl);
    let offP = () => {};
    if (hasFinePointer() && !isLite()) {
      const rx = gsap.quickTo(tilt, "rotateX", { duration: 0.8, ease: "power3" });
      const ry = gsap.quickTo(tilt, "rotateY", { duration: 0.8, ease: "power3" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const x = (e.clientX - (r.left + r.width / 2)) / innerWidth, y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        ry(gsap.utils.clamp(-6, 6, x * 12)); rx(gsap.utils.clamp(-6, 6, -y * 12));
      };
      window.addEventListener("pointermove", move, { passive: true });
      offP = () => window.removeEventListener("pointermove", move);
    }
    return () => { offV(); offP(); split.revert(); };
  }, { scope: root, dependencies: [text], revertOnUpdate: true });

  const copy = (extra: string, attrs: Record<string, unknown>) => createElement("span", { "aria-hidden": true, className: `block ${extra}`, ...attrs }, text);
  return createElement(as, { ref: root, id, "aria-label": text, className: `kinetic-h relative [perspective:800px] ${className}` },
    <span data-tilt className="relative block [transform-style:preserve-3d] will-change-transform">
      <span data-skew className="relative block origin-left will-change-transform [transform-style:preserve-3d]">
        {Array.from({ length: layers }, (_, i) => copy("pointer-events-none absolute inset-0 select-none text-[#2a1650]", {
          key: i, "data-ext": "", style: { transform: `translateZ(${-(i + 1) * 3}px) translate(${(i + 1) * 0.6}px, ${(i + 1) * 0.9}px)`, color: i === 0 ? "#4b2a8f" : undefined },
        }))}
        {copy("relative", { "data-front": "" })}
        {!isLite() && (
          <span data-sweep aria-hidden className="pointer-events-none absolute inset-0 block overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_30%,#000_70%,transparent)]" style={{ transform: "translateX(-110%)" }}>
            <span data-sweep-inner className="text-gradient block" style={{ transform: "translateX(110%)" }}>{text as ReactNode}</span>
          </span>
        )}
      </span>
    </span>,
  );
}
