import { useRef } from "react";
import { useSiteData } from "@/data/DataProvider";
import { gsap, Observer, useGSAP } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { SectionMedia } from "@/components/media/SectionMedia";
import { SectionHeader } from "./SectionHeader";

/** Two opposing marquees; scroll velocity (Observer) speeds them up and flips direction briefly. */
export function Toolkit() {
  const { settings } = useSiteData();
  const gen = settings.tools.filter((t) => t.group === "generative").map((t) => t.name);
  const fin = settings.tools.filter((t) => t.group !== "generative").map((t) => t.name);
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reducedMotion()) return;
    const rows = gsap.utils.toArray<HTMLElement>("[data-marquee]", root.current!);
    const tweens = rows.map((row, i) => {
      const dir = i % 2 === 0 ? -1 : 1;
      gsap.set(row, { xPercent: dir === -1 ? 0 : -50 });
      return gsap.to(row, { xPercent: dir === -1 ? -50 : 0, duration: 40, ease: "none", repeat: -1 });
    });
    const proxy = { s: 1 };
    const apply = () => tweens.forEach((t) => t.timeScale(proxy.s));
    const obs = Observer.create({
      target: window, type: "wheel,touch,scroll",
      onChangeY(self) {
        const v = gsap.utils.clamp(-10, 10, self.velocityY / 200);
        gsap.to(proxy, {
          s: Math.sign(v || 1) * (1 + Math.abs(v)), duration: 0.25, overwrite: true, onUpdate: apply,
          onComplete: () => { gsap.to(proxy, { s: 1, duration: 1.4, ease: "power2.out", onUpdate: apply }); },
        });
      },
    });
    return () => obs.kill();
  }, { scope: root });

  const row = (items: string[], accent: string, k: string) => {
    const list = items.length ? items : ["Add tools in admin"];
    const filled = Array.from({ length: Math.max(2, Math.ceil(12 / list.length)) }, () => list).flat();
    return (
      <div className="flex w-max" data-marquee key={k} aria-hidden>
        {[0, 1].map((dup) => (
          <ul key={dup} className="flex shrink-0 gap-4 pr-4">
            {filled.map((t, i) => (
              <li key={`${dup}-${i}`} className="flex items-center gap-3 rounded-full border border-line bg-carbon/70 px-6 py-3 font-display text-[clamp(1.3rem,3vw,2.6rem)] font-medium backdrop-blur">
                <span className="size-2 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} />{t}
              </li>
            ))}
          </ul>
        ))}
      </div>
    );
  };

  return (
    <section ref={root} id="toolkit" aria-labelledby="toolkit-title" className="relative overflow-hidden py-32 md:py-40">
      <SectionMedia sectionKey="toolkit" />
      <div className="section mb-14"><SectionHeader index="08" eyebrow="Toolkit" title={settings.copy.toolkit.headline} sub={settings.copy.toolkit.sub} /></div>
      <div className="content space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <p className="sr-only">Generative: {gen.join(", ")}. Finishing: {fin.join(", ")}.</p>
        {row(gen, "#2F6BFF", "gen")}
        {row(fin, "#C84BFF", "fin")}
      </div>
    </section>
  );
}
