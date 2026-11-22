import { HeroStatic } from "@/components/sections/HeroStatic";
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

export default function Home() {
  return (
    <>
      <HeroStatic />
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
