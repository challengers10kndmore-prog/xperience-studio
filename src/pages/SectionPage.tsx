import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PAGES, pageByPath } from "@/data/pages";
import { useSiteData } from "@/data/DataProvider";
import { siteProjects } from "@/data/placeholders";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { LightLine } from "@/motion/LightLine";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { SectionMedia } from "@/components/media/SectionMedia";
import { LogoStage } from "@/components/brand/LogoStage";
import { useXWipeNavigate } from "@/components/site/XWipe";
import { KineticHeading } from "@/components/kinetic/KineticHeading";
import { WorkCarousel } from "@/components/sections/WorkCarousel";
import { WorkGrid } from "@/components/sections/WorkGrid";
import { PremiumSamples } from "@/components/sections/PremiumSamples";
import { Services } from "@/components/sections/Services";
import { Process } from "@/components/sections/Process";
import { Manifesto } from "@/components/sections/Manifesto";
import { TwoCrafts } from "@/components/sections/TwoCrafts";
import { Proof } from "@/components/sections/Proof";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { Toolkit } from "@/components/sections/Toolkit";
import { Faq, FinaleCta } from "@/components/sections/Finale";

/** Cinematic page header: section loop, giant title, intro, and the chrome logo over its neon floor. */
function PageHero({ eyebrow, title, intro, media, index }: { eyebrow: string; title: string; intro: string; media: string; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const go = useXWipeNavigate();
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.timeline({ delay: 0.15 })
      .from(ref.current!.querySelectorAll("[data-fade]"), { opacity: 0, y: 20, stagger: 0.08, duration: 0.9 }, 0.3)
      .from(ref.current!.querySelector("[data-stage]"), { opacity: 0, y: 40, scale: 0.9, duration: 1.4, ease: "expo" }, 0.2);
  }, { scope: ref, dependencies: [title], revertOnUpdate: true });
  return (
    <section ref={ref} className="section relative flex min-h-[72svh] items-end overflow-hidden pb-14 pt-[calc(var(--nav-h)+3rem)]">
      <SectionMedia sectionKey={media} />
      <div className="content grid w-full items-end gap-10 md:grid-cols-[1.5fr_1fr]">
        <div>
          <button type="button" data-fade onClick={() => go("/")} className="eyebrow mb-8 inline-flex items-center gap-2 hover:text-chrome"><ArrowLeft className="size-4" /> Home</button>
          <p data-fade className="eyebrow mb-4 flex items-center gap-3"><span className="timecode text-magenta">{String(index + 1).padStart(2, "0")}</span>{eyebrow}</p>
          <KineticHeading key={title} as="h1" trigger="mount" delay={0.2} className="font-display text-[clamp(3.2rem,1rem+10vw,11rem)] font-semibold leading-[0.85]">{title}</KineticHeading>
          <p data-words className="mt-8 max-w-xl text-lg text-chrome/80">{intro}</p>
        </div>
        <div data-stage className="hidden justify-center md:flex"><LogoStage size="lg" /></div>
      </div>
    </section>
  );
}

function NextPage({ index }: { index: number }) {
  const go = useXWipeNavigate();
  const next = PAGES[(index + 1) % PAGES.length];
  return (
    <section className="section py-24">
      <a href={next.path} onClick={(e) => { e.preventDefault(); go(next.path); }} className="group chrome-card flex items-center justify-between gap-6 p-8 md:p-12" data-cursor="open">
        <div>
          <p className="eyebrow mb-3">Next</p>
          <KineticHeading as="p" className="font-display text-[clamp(2.2rem,1rem+5vw,5.5rem)] font-semibold leading-none transition-colors group-hover:text-magenta">{next.title}</KineticHeading>
        </div>
        <ArrowRight className="size-10 shrink-0 transition-transform duration-500 group-hover:translate-x-2" />
      </a>
    </section>
  );
}

function AllWork() {
  const data = useSiteData();
  const projects = useMemo(() => siteProjects(data.projects), [data.projects]);
  return (
    <section className="section py-20">
      <p className="eyebrow mb-3">Browse everything</p>
      <KineticHeading className="section-title mb-12 !text-[clamp(2.2rem,1rem+4vw,4.4rem)]">All films</KineticHeading>
      <WorkGrid projects={projects} />
    </section>
  );
}

function AboutDaniel() {
  const { settings } = useSiteData();
  return (
    <section className="section py-24">
      <div className="chrome-card grid gap-10 p-8 md:grid-cols-[auto_1fr] md:items-center md:p-14">
        <LogoStage size="md" />
        <div className="space-y-5">
          <p className="eyebrow">The studio</p>
          <KineticHeading className="font-display text-[clamp(1.9rem,1rem+3.6vw,3.8rem)] font-semibold leading-[0.95]">Xperience is Daniel Ogbeifun Osewe's studio for AI video and editing.</KineticHeading>
          <p data-words className="max-w-2xl text-lg text-chrome/80">{settings.hero_sub ?? ""}</p>
          <p className="font-label text-[0.65rem] tracking-[0.3em] text-ash">{settings.tagline}</p>
        </div>
      </div>
    </section>
  );
}

const BODY: Record<string, () => ReactNode> = {
  "/work": () => <><WorkCarousel /><LightLine /><AllWork /></>,
  "/selected-work": () => <PremiumSamples />,
  "/services": () => <><Services /><LightLine /><Process /><Faq /></>,
  "/process": () => <><Process /><LightLine /><Toolkit /></>,
  "/about": () => <><Manifesto /><AboutDaniel /><TwoCrafts /><LightLine /><Toolkit /></>,
  "/clients": () => <Proof />,
  "/before-after": () => <BeforeAfter />,
  "/toolkit": () => <><Toolkit /><LightLine /><Process /></>,
  "/faq": () => <Faq />,
  "/contact": () => <FinaleCta openForm />,
};

/** Standalone page for one home section (+ related content). */
export default function SectionPage() {
  const { pathname } = useLocation();
  const page = pageByPath(pathname.replace(/\/$/, "") || "/");
  const index = Math.max(0, PAGES.findIndex((p) => p.path === page?.path));
  useDocumentMeta({ title: page ? `${page.title} | Xperience` : undefined, description: page?.intro });
  useEffect(() => { const t = setTimeout(() => ScrollTrigger.refresh(), 200); return () => clearTimeout(t); }, [pathname]);
  if (!page) return null;
  return (
    <div key={page.path}>
      <PageHero eyebrow={page.eyebrow} title={page.title} intro={page.intro} media={page.media} index={index} />
      <LightLine />
      {/* each block in a React-owned wrapper (pinned sections) */}
      <div>{BODY[page.path]?.()}</div>
      {page.path !== "/contact" && <FinaleCta />}
      <NextPage index={index} />
    </div>
  );
}
