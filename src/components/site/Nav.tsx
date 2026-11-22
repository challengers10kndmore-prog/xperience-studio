import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { NavMark } from "@/components/brand/NavMark";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { scrollToTarget } from "@/motion/SmoothScroll";
import { Magnetic } from "@/motion/Magnetic";

const LINKS = [["#work", "Work"], ["#crafts", "Crafts"], ["#services", "Services"]] as const;

export function Nav({ markHidden = false }: { markHidden?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const home = pathname === "/";
  useGSAP(() => {
    // hide on scroll down, show on scroll up
    const show = gsap.to(ref.current, { yPercent: -110, duration: 0.5, ease: "expo", paused: true });
    const st = ScrollTrigger.create({ start: 200, end: "max", onUpdate: (s) => (s.direction === 1 ? show.play() : show.reverse()) });
    return () => st.kill();
  });
  const jump = (h: string) => (e: React.MouseEvent) => { if (home) { e.preventDefault(); scrollToTarget(h); } };
  return (
    <header ref={ref} className="fixed inset-x-0 top-0 z-[80] flex h-[var(--nav-h)] items-center justify-between bg-gradient-to-b from-void/80 to-transparent px-[clamp(1.25rem,4vw,4rem)]">
      <Link to="/" aria-label="Xperience home" className="flex items-center gap-3" onClick={home ? jump("#top") : undefined}>
        <span data-nav-mark-wrap style={{ opacity: markHidden ? 0 : 1 }}><NavMarkTarget /></span>
        <span className="font-label text-[0.68rem] tracking-[0.32em]">XPERIENCE</span>
      </Link>
      <nav aria-label="Primary" className="flex items-center gap-6 font-label text-[0.6rem] uppercase tracking-[0.25em] text-ash">
        {LINKS.map(([h, l]) => <a key={h} href={`/${h}`} onClick={jump(h)} className="hidden transition-colors hover:text-chrome md:inline">{l}</a>)}
        <Magnetic strength={0.25}><a href="/#contact" onClick={jump("#contact")} className="btn btn-ghost !px-4 !py-2.5 !text-[0.6rem]">Start a project</a></Magnetic>
      </nav>
    </header>
  );
}

function NavMarkTarget() {
  return <span className="block h-10 w-10" data-nav-mark-box><NavMarkWithAttr /></span>;
}
function NavMarkWithAttr() {
  return <NavMark className="h-10 w-10" ref={(el) => el?.setAttribute("data-nav-mark", "")} />;
}
