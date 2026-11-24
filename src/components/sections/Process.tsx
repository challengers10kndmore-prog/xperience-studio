import { useRef } from "react";
import { useSiteData } from "@/data/DataProvider";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { useCompact } from "@/hooks/useInView";
import { SectionMedia } from "@/components/media/SectionMedia";
import { timecode } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

const COLORS = ["#2F6BFF", "#5A4BF5", "#7C3AED", "#A142F6", "#C84BFF"];
const TOTAL_S = 150;

/**
 * Desktop: pinned horizontal edit timeline, scroll scrubs the playhead, clips "render" as it crosses them.
 * Phones (portrait or landscape): a vertical timeline. The playhead line draws down with scroll and each pass
 * renders (hatched -> solid) as the playhead reaches it, with a sticky running timecode.
 */
export function Process() {
  const { copy } = useSiteData().settings;
  const compact = useCompact();
  return (
    <section id="process" aria-labelledby="process-title" className="relative">
      <div className="section pb-10 pt-[var(--section-y)]"><SectionHeader index="07" eyebrow="Process" title={copy.process.headline} /></div>
      {compact ? <ProcessVertical steps={copy.process.steps} /> : <ProcessHorizontal steps={copy.process.steps} />}
    </section>
  );
}

type Step = { title: string; text: string };

function Clip({ s, i, n }: { s: Step; i: number; n: number }) {
  return (
    <>
      <div className="process-hatch absolute inset-0" aria-hidden />
      <div className="relative space-y-3 p-6 md:min-h-[300px] md:p-8">
        <div className="flex items-center justify-between">
          <span className="timecode text-xs text-ash">{timecode((i * TOTAL_S) / n)}</span>
          <span className="process-status font-label text-[0.55rem] tracking-[0.25em]" />
        </div>
        <p className="font-label text-[0.65rem] tracking-[0.3em]" style={{ color: COLORS[i % COLORS.length] }}>PASS {String(i + 1).padStart(2, "0")}</p>
        <h3 className="font-display text-[clamp(1.7rem,1.2rem+1.6vw,2.4rem)] font-semibold">{s.title}</h3>
        <p data-words className="max-w-sm text-chrome/80">{s.text}</p>
      </div>
    </>
  );
}

function ProcessHorizontal({ steps }: { steps: Step[] }) {
  const root = useRef<HTMLDivElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const el = root.current!;
    const track = el.querySelector<HTMLElement>("[data-track]")!;
    const clips = gsap.utils.toArray<HTMLElement>("[data-clip]", el);
    if (reducedMotion()) { clips.forEach((c) => c.classList.add("is-rendered")); return; }
    const distance = () => track.scrollWidth - el.clientWidth * 0.55;
    gsap.to(track, {
      x: () => -distance(), ease: "none",
      scrollTrigger: {
        trigger: el, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate(self) {
          if (tc.current) tc.current.textContent = timecode(self.progress * TOTAL_S);
          const head = el.querySelector<HTMLElement>("[data-playhead]")!.getBoundingClientRect().left;
          clips.forEach((c) => {
            const r = c.getBoundingClientRect();
            c.classList.toggle("is-rendered", r.right < head + 4);
            c.classList.toggle("is-active", r.left <= head && r.right >= head);
          });
        },
      },
    });
  }, { scope: root });
  return (
    <div ref={root} data-offscreen-ok className="relative h-svh overflow-hidden">
      <SectionMedia sectionKey="process" />
      <div className="content flex h-full flex-col justify-center gap-6">
        <div className="flex items-center justify-between px-[var(--gutter)]">
          <span className="eyebrow">V1 · Edit</span>
          <span className="timecode rounded-md border border-line bg-carbon/80 px-3 py-1.5 text-sm text-chrome" aria-hidden><span ref={tc}>00:00:00:00</span></span>
        </div>
        <div className="relative">
          <div aria-hidden className="mb-3 h-6 bg-[repeating-linear-gradient(90deg,rgba(143,139,163,.5)_0_1px,transparent_1px_24px)] [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" />
          <ol data-track className="flex w-max flex-row gap-3 pl-[45vw] pr-[20vw] will-change-transform">
            {steps.map((s, i) => (
              <li key={i} data-clip className="process-clip relative w-[34vw] max-w-[520px] overflow-hidden rounded-lg border border-line" style={{ ["--clip" as string]: COLORS[i % COLORS.length] }}>
                <Clip s={s} i={i} n={steps.length} />
              </li>
            ))}
          </ol>
          <div data-playhead aria-hidden className="pointer-events-none absolute -top-2 bottom-0 left-[45vw] w-[2px] bg-magenta shadow-[0_0_16px_#C84BFF]">
            <span className="absolute -left-[7px] -top-1 h-0 w-0 border-x-8 border-t-[10px] border-x-transparent border-t-magenta" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessVertical({ steps }: { steps: Step[] }) {
  const root = useRef<HTMLDivElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const el = root.current!;
    const clips = gsap.utils.toArray<HTMLElement>("[data-clip]", el);
    const line = el.querySelector<HTMLElement>("[data-line]");
    const head = el.querySelector<HTMLElement>("[data-head]");
    if (reducedMotion()) { clips.forEach((c) => c.classList.add("is-rendered")); gsap.set(line, { scaleY: 1 }); return; }
    gsap.fromTo(line, { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: el, start: "top 60%", end: "bottom 60%", scrub: 0.4, onUpdate: (s) => { if (tc.current) tc.current.textContent = timecode(s.progress * TOTAL_S); gsap.set(head, { top: `${s.progress * 100}%` }); } },
    });
    clips.forEach((c) => {
      gsap.fromTo(c, { clipPath: "inset(0 100% 0 0 round 8px)", x: 24 }, { clipPath: "inset(0 0% 0 0 round 8px)", x: 0, duration: 1, ease: "expo", scrollTrigger: { trigger: c, start: "top 85%" } });
      ScrollTrigger.create({ trigger: c, start: "top 60%", end: "bottom 60%", onEnter: () => c.classList.add("is-active"), onLeave: () => { c.classList.remove("is-active"); c.classList.add("is-rendered"); }, onEnterBack: () => { c.classList.add("is-active"); c.classList.remove("is-rendered"); }, onLeaveBack: () => c.classList.remove("is-active") });
    });
  }, { scope: root });
  return (
    <div ref={root} className="relative px-[var(--gutter)] pb-[var(--section-y)]">
      <SectionMedia sectionKey="process" className="opacity-50" />
      <div className="sticky top-[calc(var(--nav-h)+0.5rem)] z-20 mb-6 flex justify-end">
        <span className="timecode rounded-md border border-line bg-carbon/90 px-3 py-1.5 text-sm text-chrome" aria-hidden><span ref={tc}>00:00:00:00</span></span>
      </div>
      <div className="content relative pl-8">
        <div aria-hidden className="absolute bottom-0 left-2 top-0 w-px bg-line" />
        <div data-line aria-hidden className="absolute bottom-0 left-2 top-0 w-[2px] origin-top bg-[linear-gradient(180deg,#2F6BFF,#7C3AED,#C84BFF)] shadow-[0_0_12px_#7C3AED]" />
        <span data-head aria-hidden className="absolute left-2 top-0 size-3 -translate-x-[5px] -translate-y-1/2 rounded-full bg-magenta shadow-[0_0_14px_#C84BFF]" />
        <ol className="space-y-5">
          {steps.map((s, i) => (
            <li key={i} data-clip className="process-clip relative overflow-hidden rounded-lg border border-line" style={{ ["--clip" as string]: COLORS[i % COLORS.length] }}>
              <Clip s={s} i={i} n={steps.length} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
