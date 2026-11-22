import { useSiteData } from "@/data/DataProvider";
import { XperienceLogo } from "@/components/brand/XperienceLogo";

/** Phase 1 placeholder hero (replaced by "The Assembly" in Phase 5). */
export function HeroStatic() {
  const { settings } = useSiteData();
  return (
    <section id="top" className="section media-placeholder relative flex min-h-dvh flex-col justify-end pb-[12vh] pt-[var(--nav-h)]">
      <div className="max-w-5xl space-y-6">
        <p className="eyebrow">AI Video · Video Editing</p>
        <h1 className="text-[clamp(3rem,9vw,8.5rem)] font-semibold">{settings.hero_headline}</h1>
        <p className="max-w-xl text-lg text-ash">{settings.hero_sub}</p>
        <div className="flex flex-wrap gap-3">
          <a href="#work" className="btn btn-primary">{settings.hero_cta_primary}</a>
          <a href="#contact" className="btn btn-ghost">{settings.hero_cta_secondary}</a>
        </div>
        <p className="flex items-center gap-2 text-sm text-ash">
          <XperienceLogo variant="mark" className="h-5 w-5" aria-hidden /> {settings.credit_line}
        </p>
      </div>
    </section>
  );
}
