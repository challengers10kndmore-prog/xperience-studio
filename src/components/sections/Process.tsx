import { useRef } from "react";
import { useSiteData } from "@/data/DataProvider";
import { gsap, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { SectionMedia } from "@/components/media/SectionMedia";
import { timecode } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

const COLORS = ["#2F6BFF", "#5A4BF5", "#7C3AED", "#A142F6", "#C84BFF"];
const TOTAL_S = 150;

/** Pinned horizontal edit timeline: scroll scrubs the playhead, clips "render" as it crosses them, mono timecode. */
export function Process() {
  const { copy } = useSiteData().settings;
  const steps = copy.process.steps;
  const root = useRef<HTMLDivElement>(null);
  const tc = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const track = el.querySelector<HTMLElement>("[data-track]")!;
    const clips = gsap.utils.toArray<HTMLElement>("[data-clip]", el);
    if (reducedMotion() || window.matchMedia("(max-width: 767px)").matches) {
      clips.forEach((c) => c.classList.add("is-rendered"));
      return;
    }
    const distance = () => track.scrollWidth - el.clientWidth * 0.55;
    gsap.to(track, {
      x: () => -distance(), ease: "none",
      scrollTrigger: {
        trigger: el, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate(self) {
          if (tc.current) tc.current.textContent = timecode(self.progress * TOTAL_S);
          const head = el.querySelector<HTMLElement>("[data-playhead]")!.getBoundingClientRect().left;
          clips.forEach((c) => c.classList.toggle("is-rendered", c.getBoundingClientRect().right < head + 4));
          clips.forEach((c) => {
            const r = c.getBoundingClientRect();
            c.classList.toggle("is-active", r.left <= head && r.right >= head);
          });
        },
      },
    });
  }, { scope: root });

  return (
    <section id="process" aria-labelledby="process-title" className="relative">
      <div className="section pb-10 pt-32 md:pt-40"><SectionHeader index="07" eyebrow="Process" title={copy.process.headline} /></div>
      <div ref={root} className="relative overflow-hidden md:h-dvh">
        <SectionMedia sectionKey="process" />
        <div className="content flex h-full flex-col justify-center gap-6 py-10 md:py-0">
          <div className="flex items-center justify-between px-[clamp(1.25rem,4vw,4rem)]">
            <span className="eyebrow">V1 · Edit</span>
            <span className="timecode rounded-md border border-line bg-carbon/80 px-3 py-1.5 text-sm text-chrome" aria-hidden><span ref={tc}>00:00:00:00</span></span>
          </div>
          <div className="relative">
            <div aria-hidden className="mb-3 h-6 bg-[repeating-linear-gradient(90deg,rgba(143,139,163,.5)_0_1px,transparent_1px_24px)] [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" />
            <ol data-track className="flex flex-col gap-4 px-[clamp(1.25rem,4vw,4rem)] will-change-transform md:w-max md:flex-row md:gap-3 md:pl-[45vw] md:pr-[20vw]">
              {steps.map((s, i) => (
                <li key={i} data-clip className="process-clip group relative overflow-hidden rounded-lg border border-line md:w-[34vw] md:max-w-[520px]" style={{ ["--clip" as string]: COLORS[i % COLORS.length] }}>
                  <div className="process-hatch absolute inset-0" aria-hidden />
                  <div className="relative space-y-3 p-6 md:min-h-[300px] md:p-8">
                    <div className="flex items-center justify-between">
                      <span className="timecode text-xs text-ash">{timecode((i * TOTAL_S) / steps.length)}</span>
                      <span className="process-status font-label text-[0.55rem] tracking-[0.25em]" />
                    </div>
                    <p className="font-label text-[0.65rem] tracking-[0.3em]" style={{ color: COLORS[i % COLORS.length] }}>PASS {String(i + 1).padStart(2, "0")}</p>
                    <h3 className="font-display text-3xl font-semibold md:text-4xl">{s.title}</h3>
                    <p className="max-w-sm text-chrome/80">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div data-playhead aria-hidden className="pointer-events-none absolute -top-2 bottom-0 left-[45vw] hidden w-[2px] bg-magenta shadow-[0_0_16px_#C84BFF] md:block">
              <span className="absolute -left-[7px] -top-1 h-0 w-0 border-x-8 border-t-[10px] border-x-transparent border-t-magenta" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
