import { useEffect } from "react";
import { ScrollTrigger } from "@/motion/gsap";
import { Manifesto } from "@/components/sections/Manifesto";
import { PremiumSamples } from "@/components/sections/PremiumSamples";
import { TwoCrafts } from "@/components/sections/TwoCrafts";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { WorkLibrary } from "@/components/sections/WorkLibrary";
import { Process } from "@/components/sections/Process";
import { Toolkit } from "@/components/sections/Toolkit";
import { Proof } from "@/components/sections/Proof";
import { Services } from "@/components/sections/Services";
import { Faq, FinaleCta } from "@/components/sections/Finale";
import { LightLine } from "@/motion/LightLine";

/** Everything below the hero, in its own chunk so the hero paints first. */
export default function BelowFold() {
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 100);
    if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <Manifesto />
      <PremiumSamples />
      <LightLine />
      <TwoCrafts />
      <BeforeAfter />
      <LightLine />
      <WorkLibrary />
      <Process />
      <LightLine />
      <Toolkit />
      <Proof />
      <LightLine />
      <Services />
      <Faq />
      <FinaleCta />
    </>
  );
}
