import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { useSiteData } from "@/data/DataProvider";
import type { Service } from "@/data/types";
import { gsap, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { LazyVideo } from "@/components/media/LazyVideo";
import { scrollToTarget } from "@/motion/SmoothScroll";
import { SectionHeader } from "./SectionHeader";
import { useTouchActive } from "@/hooks/useInView";

/** Four offers dealt from a 3D deck (fan-in on scroll); hovering a card plays its 3 s loop. */
export function Services() {
  const data = useSiteData();
  const root = useRef<HTMLUListElement>(null);
  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>("[data-service]", root.current!);
    if (reducedMotion()) return;
    const mid = (cards.length - 1) / 2;
    if (window.matchMedia("(max-width: 767px)").matches) {
      // phones: deal the cards up from below in 3D (nothing ever leaves the screen sideways)
      cards.forEach((c) => gsap.from(c, { y: 90, rotateX: 28, opacity: 0, transformPerspective: 900, transformOrigin: "50% 100%", duration: 1.2, ease: "expo", scrollTrigger: { trigger: c, start: "top 92%" } }));
      return;
    }
    gsap.from(cards, {
      rotateY: (i) => (i - mid) * -18, rotateZ: (i) => (i - mid) * 6, xPercent: (i) => (mid - i) * 95, y: 120, z: -300,
      opacity: 0, transformPerspective: 1400, transformOrigin: "50% 120%", stagger: 0.06, duration: 1.6, ease: "expo",
      scrollTrigger: { trigger: root.current, start: "top 85%" },
    });
  }, { scope: root });
  return (
    <section id="services" aria-labelledby="services-title" className="section py-32 md:py-40">
      <SectionHeader index="10" eyebrow="Services" title={data.settings.copy.services.headline} className="mb-16" />
      <ul ref={root} className="content grid gap-5 [perspective:1400px] sm:grid-cols-2 xl:grid-cols-4">
        {data.services.map((s, i) => <Card key={s.id} s={s} i={i} loop={s.loop_url || data.sectionMedia[`service-${s.slug}`]?.desktop_url || null} />)}
      </ul>
    </section>
  );
}

function Card({ s, i, loop }: { s: Service; i: number; loop: string | null }) {
  const ref = useRef<HTMLLIElement>(null);
  const [hoverState, setHover] = useState(false);
  const touchOn = useTouchActive(ref);
  const hover = hoverState || touchOn;
  const todo = (v?: string | null) => !v || /^todo$/i.test(v.trim());
  return (
    <li ref={ref} data-service className="group relative flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-line bg-carbon will-change-transform"
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <div className="relative aspect-[4/5] max-h-[260px] w-full overflow-hidden">
        {loop ? <LazyVideo src={loop} play={hover} autoPlayInView={false} className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100" />
          : <div className="media-placeholder h-full w-full opacity-70 transition duration-700 group-hover:opacity-100" style={{ animationPlayState: hover ? "running" : "paused" }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/20 to-transparent" />
        <span className="timecode absolute left-5 top-5 text-sm text-magenta">0{i + 1}</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="font-display text-2xl font-semibold leading-tight">{s.title}</h3>
        <p className="text-sm text-chrome/80">{s.description}</p>
        {s.included.length > 0 && (
          <ul className="space-y-1.5 text-sm text-ash">
            {s.included.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-violet" />{x}</li>)}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="eyebrow !text-[0.55rem]">Turnaround</p>
            <p className="text-sm">{todo(s.turnaround) ? <span className="text-amber-200">TBC</span> : s.turnaround}</p>
          </div>
          {!todo(s.price_from) && <div className="text-right"><p className="eyebrow !text-[0.55rem]">From</p><p className="font-display text-xl">{s.price_from}</p></div>}
        </div>
        <button type="button" onClick={() => scrollToTarget("#contact")} className="btn btn-ghost justify-center">Ask about this</button>
      </div>
    </li>
  );
}
