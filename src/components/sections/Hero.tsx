import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useSiteData } from "@/data/DataProvider";
import { featuredOf, siteProjects } from "@/data/placeholders";
import { SectionMedia } from "@/components/media/SectionMedia";
import { usePlayer } from "@/components/media/Player";
import { ScrollTrigger, useGSAP } from "@/motion/gsap";
import { useWebGL } from "@/three/webgl";
import type { HeroSignals } from "@/three/HeroAssembly";
import { HeroCopy, HeroStatic } from "./HeroStatic";

const HeroAssembly = lazy(() => import("@/three/HeroAssembly"));

/**
 * Hero "The Assembly": a particle figure that assembles as the visitor moves (cursor energy / scroll + tilt on touch),
 * resolves into a rim-lit figure with a scan-line sweep, then video shards from featured projects orbit it.
 * Scroll-out disperses particles upward and flies the shards forward. GPU tier < 2 or reduced motion -> HeroStatic.
 */
export function Hero() {
  const gl = useWebGL();
  if (!gl.ready || !gl.enabled) return <HeroStatic />;
  return <HeroGL mobile={gl.mobile} />;
}

function HeroGL({ mobile }: { mobile: boolean }) {
  const data = useSiteData();
  const shards = useMemo(() => featuredOf(siteProjects(data.projects)).slice(0, mobile ? 5 : 7), [data.projects, mobile]);
  const open = usePlayer();
  const root = useRef<HTMLElement>(null);
  const signals = useRef<HeroSignals>({ energy: { current: 0 }, scroll: { current: 0 }, pointer: { current: { x: 0, y: 0 } } }).current;

  useEffect(() => {
    let last = { x: 0, y: 0, t: performance.now() };
    let lastMove = performance.now();
    let holdUntil = 0;
    let raf = 0;
    const visible = () => signals.scroll.current < 0.98;
    const bump = (amount: number) => {
      lastMove = performance.now();
      signals.energy.current = Math.min(1, signals.energy.current + amount);
      if (signals.energy.current >= 0.999 && holdUntil < lastMove) holdUntil = lastMove + 7000;
    };
    const onMove = (e: PointerEvent) => {
      if (!visible()) return;
      const now = performance.now();
      const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
      const w = window.innerWidth, h = window.innerHeight;
      signals.pointer.current = { x: (e.clientX / w) * 2 - 1, y: (e.clientY / h) * 2 - 1 };
      // proximity to the figure (right of centre on desktop) boosts the gain
      const fx = mobile ? 0.5 : 0.68;
      const prox = 1 - Math.min(1, Math.hypot(e.clientX / w - fx, e.clientY / h - 0.5) / 0.6);
      if (e.pointerType === "mouse") bump(Math.min(dist, 120) * 0.0011 * (0.5 + prox));
      last = { x: e.clientX, y: e.clientY, t: now };
    };
    const onScroll = () => { if (mobile && signals.scroll.current < 0.4) bump(0.03); };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return;
      signals.pointer.current = { x: Math.max(-1, Math.min(1, e.gamma / 30)), y: Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 30)) };
      bump(0.004);
    };
    const tick = () => {
      const now = performance.now();
      if (now > holdUntil && now - lastMove > 1200) signals.energy.current = Math.max(0.12, signals.energy.current - 0.0025);
      raf = requestAnimationFrame(tick);
    };
    signals.energy.current = 0.28; // a hint of the figure on arrival
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("deviceorientation", onTilt);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); window.removeEventListener("scroll", onScroll); window.removeEventListener("deviceorientation", onTilt); };
  }, [mobile, signals]);

  useGSAP(() => {
    const st = ScrollTrigger.create({ trigger: root.current, start: "top top", end: "bottom top", onUpdate: (s) => { signals.scroll.current = s.progress; } });
    return () => st.kill();
  });

  return (
    <section ref={root} id="top" className="section relative flex min-h-dvh flex-col justify-end pb-[12vh] pt-[var(--nav-h)]">
      <SectionMedia sectionKey="hero" />
      <Suspense fallback={null}>
        <HeroAssembly signals={signals} shards={shards} mobile={mobile} onOpen={(p) => open(p, root.current)} />
      </Suspense>
      <HeroCopy />
      <p className="eyebrow pointer-events-none absolute bottom-6 right-[clamp(1.25rem,4vw,4rem)] hidden md:block" aria-hidden>Move to assemble</p>
    </section>
  );
}
