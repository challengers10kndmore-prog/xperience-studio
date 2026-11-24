import { Fragment, useEffect, type ReactNode } from "react";
import { ScrollTrigger } from "@/motion/gsap";
import { useSiteData } from "@/data/DataProvider";
import { visibleSections, type SectionKey } from "@/data/layout";
import { Manifesto } from "@/components/sections/Manifesto";
import { PremiumSamples } from "@/components/sections/PremiumSamples";
import { TwoCrafts } from "@/components/sections/TwoCrafts";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { WorkCarousel } from "@/components/sections/WorkCarousel";
import { Process } from "@/components/sections/Process";
import { Toolkit } from "@/components/sections/Toolkit";
import { Proof } from "@/components/sections/Proof";
import { Services } from "@/components/sections/Services";
import { Faq, FinaleCta } from "@/components/sections/Finale";
import { LightLine } from "@/motion/LightLine";

const RENDER: Record<SectionKey, () => ReactNode> = {
  work: () => <WorkCarousel />,
  premium: () => <PremiumSamples />,
  manifesto: () => <Manifesto />,
  crafts: () => <TwoCrafts />,
  "before-after": () => <BeforeAfter />,
  process: () => <Process />,
  toolkit: () => <Toolkit />,
  proof: () => <Proof />,
  services: () => <Services />,
  faq: () => <Faq />,
  contact: () => <FinaleCta />,
};
/** Full-bleed sections don't need a light-line before them. */
const NO_LINE = new Set<SectionKey>(["manifesto", "premium", "contact"]);

/** Everything below the hero, in the order set in admin > Website customization. Own chunk so the hero paints first. */
export default function BelowFold() {
  const { settings } = useSiteData();
  const order = visibleSections(settings.layout);
  const sig = order.join(",");
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 150);
    if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 400);
    return () => clearTimeout(t);
  }, [sig]);
  return (
    <>
      {order.map((k, i) => (
        // each section sits in its own React-owned wrapper so pinned sections (GSAP pin-spacers) can be reordered safely
        <Fragment key={k}>
          {i > 0 && !NO_LINE.has(k) && <LightLine />}
          <div data-home-section={k}>{RENDER[k]()}</div>
        </Fragment>
      ))}
    </>
  );
}
