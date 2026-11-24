/**
 * One shared, smoothed scroll velocity for the whole site (px/s, signed). Elements subscribe with a setter;
 * the value springs back to 0 when scrolling stops. A single gsap ticker drives every subscriber.
 */
import { gsap, ScrollTrigger } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { isLite } from "@/lib/perf";

type Sub = (v: number) => void;
const subs = new Set<Sub>();
let raw = 0, smooth = 0, started = false;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => { raw = s.getVelocity(); } });
  gsap.ticker.add(() => {
    raw *= 0.86; // decays to 0 between scroll events
    smooth += (raw - smooth) * 0.12;
    if (Math.abs(smooth) < 0.5) smooth = 0;
    subs.forEach((f) => f(smooth));
  });
}

export function onVelocity(fn: Sub) {
  if (reducedMotion() || isLite()) return () => {};
  start();
  subs.add(fn);
  return () => { subs.delete(fn); };
}

/** Skew + vertical stretch from velocity, spring-back built in (subtle: max 6deg / +8%). */
export function velocitySkew(el: HTMLElement) {
  const skew = gsap.quickSetter(el, "skewY", "deg") as (v: number) => void;
  const sy = gsap.quickSetter(el, "scaleY") as (v: number) => void;
  return onVelocity((v) => {
    const k = gsap.utils.clamp(-1, 1, v / 3000);
    skew(k * -6);
    sy(1 + Math.abs(k) * 0.08);
  });
}
