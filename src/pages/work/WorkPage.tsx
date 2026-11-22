import { useMemo, useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSiteData } from "@/data/DataProvider";
import { siteProjects } from "@/data/placeholders";
import { gsap, SplitText, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { SectionMedia } from "@/components/media/SectionMedia";
import { WorkGrid } from "@/components/sections/WorkGrid";
import { useXWipeNavigate } from "@/components/site/XWipe";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { LightLine } from "@/motion/LightLine";

const META = {
  ai: { title: "AI Video", key: "crafts-ai", accent: "text-electric", line: "Concept to finished film with generative tools." },
  editing: { title: "Video Editing", key: "crafts-editing", accent: "text-magenta", line: "Your footage, cut for pace, colour and sound." },
} as const;
const pretty = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** /work/:discipline and /work/:discipline/:category: cinematic header + the Work Library grid. */
export default function WorkPage() {
  const { discipline, category } = useParams();
  const data = useSiteData();
  const go = useXWipeNavigate();
  const head = useRef<HTMLElement>(null);
  const d = discipline === "ai" || discipline === "editing" ? discipline : null;
  const meta = d ? META[d] : null;
  const projects = useMemo(() => siteProjects(data.projects), [data.projects]);
  const count = projects.filter((p) => p.discipline === d && (!category || p.category === category)).length;
  const lead = d === "ai" ? data.settings.copy.crafts.ai : d === "editing" ? data.settings.copy.crafts.editing : "";
  useDocumentMeta({ title: meta ? `${category ? `${pretty(category)} · ` : ""}${meta.title} | Xperience` : undefined, description: lead || undefined });

  useGSAP(() => {
    if (!head.current) return;
    const h = head.current.querySelector("h1")!;
    if (reducedMotion()) return;
    const split = SplitText.create(h, { type: "chars", mask: "chars" });
    gsap.timeline({ delay: 0.15 })
      .from(split.chars, { yPercent: 120, rotate: 8, stagger: 0.025, duration: 1.2, ease: "expo" })
      .from(head.current.querySelectorAll("[data-fade]"), { opacity: 0, y: 20, stagger: 0.08, duration: 0.9 }, 0.3)
      .fromTo(head.current.querySelector("[data-media]"), { scale: 1.15 }, { scale: 1, duration: 2.4, ease: "expo" }, 0);
    return () => split.revert();
  }, { scope: head, dependencies: [d, category] });

  if (!meta) return <Navigate to="/" replace />;
  return (
    <>
      <section ref={head} className="section relative flex min-h-[78dvh] flex-col justify-end overflow-hidden pb-16 pt-[calc(var(--nav-h)+4rem)]">
        <div data-media className="absolute inset-0 -z-10"><SectionMedia sectionKey={meta.key} /></div>
        <div className="content">
          <button type="button" data-fade onClick={() => go("/")} className="eyebrow mb-10 inline-flex items-center gap-2 hover:text-chrome"><ArrowLeft className="size-4" /> Back to the reel</button>
          <p data-fade className={`eyebrow mb-4 ${meta.accent}`}>{category ? `${meta.title} / ${pretty(category)}` : "Discipline"}</p>
          <h1 className="font-display text-[clamp(3.5rem,13vw,13rem)] font-semibold leading-[0.85]">{category ? pretty(category) : meta.title}</h1>
          <div data-fade className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <p className="max-w-xl text-lg text-chrome/80">{lead || meta.line}</p>
            <p className="timecode text-ash">{String(count).padStart(2, "0")} FILMS</p>
          </div>
        </div>
      </section>
      <LightLine />
      <section className="section py-20">
        <WorkGrid key={`${d}-${category ?? ""}`} projects={projects} lockDiscipline={d ?? undefined} initialCategory={category ?? null} />
      </section>
    </>
  );
}
