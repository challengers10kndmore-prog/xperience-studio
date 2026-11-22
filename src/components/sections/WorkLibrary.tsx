import { useMemo } from "react";
import { useSiteData } from "@/data/DataProvider";
import { siteProjects } from "@/data/placeholders";
import { SectionMedia } from "@/components/media/SectionMedia";
import { SectionHeader } from "./SectionHeader";
import { WorkGrid } from "./WorkGrid";

export function WorkLibrary() {
  const data = useSiteData();
  const projects = useMemo(() => siteProjects(data.projects), [data.projects]);
  const copy = data.settings.copy.library;
  return (
    <section id="library" aria-labelledby="library-title" className="section relative py-32 md:py-40">
      <SectionMedia sectionKey="library" className="opacity-60" />
      <SectionHeader index="06" eyebrow="Work library" title={copy.headline} sub={copy.sub} className="mb-14" />
      <WorkGrid projects={projects} />
    </section>
  );
}
