import { useSiteData } from "@/data/DataProvider";
import { SectionMedia } from "@/components/media/SectionMedia";
import { TextCylinder } from "@/components/kinetic/TextCylinder";
import { SectionHeader } from "./SectionHeader";

/** The kit: two counter-rotating 3D cylinders of tool names; speed and tilt follow scroll velocity. */
export function Toolkit() {
  const { settings } = useSiteData();
  const gen = settings.tools.filter((t) => t.group === "generative").map((t) => t.name);
  const fin = settings.tools.filter((t) => t.group !== "generative").map((t) => t.name);
  const chip = "rounded-full border border-line bg-carbon/80 px-[0.7em] py-[0.18em] font-display font-medium text-chrome";
  return (
    <section id="toolkit" aria-labelledby="toolkit-title" className="relative overflow-hidden py-[var(--section-y)]">
      <SectionMedia sectionKey="toolkit" />
      <div className="section mb-14"><SectionHeader index="08" eyebrow="Toolkit" title={settings.copy.toolkit.headline} sub={settings.copy.toolkit.sub} /></div>
      <p className="sr-only">Generative: {gen.join(", ")}. Finishing: {fin.join(", ")}.</p>
      <div className="content space-y-[0.6em] text-[clamp(1.3rem,0.9rem+2.2vw,3rem)] [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <TextCylinder items={gen.map((t) => `◆ ${t}`)} direction={1} itemClassName={`${chip} !border-electric/40`} className="!h-[1.9em]" radius={1100} />
        <TextCylinder items={fin.map((t) => `◆ ${t}`)} direction={-1} itemClassName={`${chip} !border-magenta/40`} className="!h-[1.9em]" radius={1100} />
      </div>
    </section>
  );
}
