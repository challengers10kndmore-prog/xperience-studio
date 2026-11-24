import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, X } from "lucide-react";
import { NavMark } from "@/components/brand/NavMark";
import { LogoStage } from "@/components/brand/LogoStage";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { Magnetic } from "@/motion/Magnetic";
import { reducedMotion } from "@/motion/useReducedMotion";
import { PAGES } from "@/data/pages";
import { useSiteData } from "@/data/DataProvider";
import { useXWipeNavigate } from "./XWipe";

/** Glass header: logo, the main pages, Start a project, and a full-screen menu with every page. */
export function Nav({ markHidden = false }: { markHidden?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const go = useXWipeNavigate();
  const [menu, setMenu] = useState(false);
  const [solid, setSolid] = useState(false);
  useGSAP(() => {
    const hide = gsap.to(ref.current, { yPercent: -110, duration: 0.5, ease: "expo", paused: true });
    const st = ScrollTrigger.create({ start: 200, end: "max", onUpdate: (s) => { if (menu) return; if (s.direction === 1) hide.play(); else hide.reverse(); } });
    const st2 = ScrollTrigger.create({ start: 40, end: "max", onToggle: (s) => setSolid(s.isActive) });
    return () => { st.kill(); st2.kill(); };
  }, { dependencies: [menu] });
  useEffect(() => setMenu(false), [pathname]);

  const link = (to: string) => (e: React.MouseEvent) => { e.preventDefault(); if (to !== pathname) go(to); };
  return (
    <>
      <header ref={ref} className={`fixed inset-x-0 top-0 z-[80] transition-colors duration-500 ${solid ? "bg-void/70 backdrop-blur-xl" : "bg-gradient-to-b from-void/80 to-transparent"}`}>
        <div className="flex h-[var(--nav-h)] items-center justify-between gap-6 px-[var(--gutter)]">
          <Link to="/" aria-label="Xperience home" className="flex items-center gap-3" onClick={link("/")}>
            <span data-nav-mark-wrap style={{ opacity: markHidden ? 0 : 1 }}><span className="block h-10 w-10"><NavMark className="h-10 w-10" ref={(el) => el?.setAttribute("data-nav-mark", "")} /></span></span>
            <span className="font-label text-[0.68rem] tracking-[0.32em]">XPERIENCE</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 xl:flex">
            {PAGES.filter((p) => p.header).map((p) => {
              const active = pathname === p.path || (p.path === "/work" && pathname.startsWith("/work"));
              return (
                <a key={p.path} href={p.path} onClick={link(p.path)} aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-3.5 py-2 font-label text-[0.6rem] uppercase tracking-[0.22em] transition-colors ${active ? "text-chrome" : "text-ash hover:text-chrome"}`}>
                  {p.label}
                  <span className={`absolute inset-x-3 -bottom-0.5 h-px origin-left bg-[linear-gradient(90deg,#C84BFF,#7C3AED,#2F6BFF)] transition-transform duration-500 ${active ? "scale-x-100" : "scale-x-0"}`} />
                </a>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Magnetic strength={0.25}><a href="/contact" onClick={link("/contact")} className="btn btn-primary hidden !px-4 !py-2.5 !text-[0.6rem] sm:inline-flex">Start a project</a></Magnetic>
            <button type="button" onClick={() => setMenu(true)} aria-expanded={menu} aria-controls="site-menu"
              className="group flex h-10 items-center gap-2.5 rounded-full border border-line bg-void/50 px-4 font-label text-[0.58rem] tracking-[0.22em] backdrop-blur hover:border-violet">
              <span className="flex flex-col gap-[3px]"><span className="block h-px w-4 bg-chrome transition-all group-hover:w-3" /><span className="block h-px w-4 bg-chrome" /></span> MENU
            </button>
          </div>
        </div>
      </header>
      {menu && createPortal(<Menu onClose={() => setMenu(false)} go={(to) => { setMenu(false); if (to !== pathname) go(to); }} />, document.body)}
    </>
  );
}

function Menu({ onClose, go }: { onClose: () => void; go: (to: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const { settings } = useSiteData();
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.timeline()
      .fromTo(root.current, { clipPath: "circle(0% at 100% 0%)" }, { clipPath: "circle(150% at 100% 0%)", duration: 0.9, ease: "cine" })
      .from("[data-menu-item]", { yPercent: 110, opacity: 0, stagger: 0.04, duration: 0.8, ease: "expo" }, 0.25)
      .from("[data-menu-side]", { opacity: 0, x: 30, duration: 0.8, ease: "expo" }, 0.35);
  }, { scope: root });
  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void } }).__lenis;
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>("button")?.focus();
    return () => { lenis?.start(); window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  const wa = settings.whatsapp?.replace(/\D/g, "");
  return (
    <div ref={root} id="site-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[300] overflow-y-auto bg-void">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_20%,rgba(124,58,237,.25),transparent_70%),radial-gradient(50%_50%_at_10%_90%,rgba(47,107,255,.15),transparent_70%)]" />
      <div className="relative flex h-[var(--nav-h)] items-center justify-end px-[var(--gutter)]">
        <button type="button" onClick={onClose} className="flex h-10 items-center gap-2 rounded-full border border-line px-4 font-label text-[0.58rem] tracking-[0.22em] hover:border-violet"><X className="size-4" /> CLOSE</button>
      </div>
      <div className="relative grid gap-10 px-[var(--gutter)] pb-12 pt-4 lg:grid-cols-[1.4fr_1fr]">
        <nav aria-label="All pages">
          <ol className="grid gap-x-10 sm:grid-cols-2">
            {[{ path: "/", label: "Home" }, ...PAGES].map((p, i) => (
              <li key={p.path} className="overflow-hidden border-b border-line/60">
                <a data-menu-item href={p.path} onClick={(e) => { e.preventDefault(); go(p.path); }}
                  className="group flex items-baseline gap-4 py-3.5 font-display text-[clamp(1.6rem,3.4vw,2.8rem)] font-semibold leading-none transition-colors hover:text-magenta">
                  <span className="timecode text-xs text-ash">{String(i).padStart(2, "0")}</span>{p.label}
                  <ArrowUpRight className="ml-auto size-5 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <aside data-menu-side className="flex flex-col items-center justify-center gap-8 text-center">
          <LogoStage size="lg" />
          <div className="space-y-2 text-sm text-ash">
            <p>{settings.credit_line}</p>
            {settings.contact_email && <p><a className="text-chrome hover:text-magenta" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></p>}
            {wa && <p><a className="text-chrome hover:text-magenta" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a></p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
