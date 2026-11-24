import { useMemo } from "react";
import { useSiteData } from "@/data/DataProvider";
import { siteProjects, artFor } from "@/data/placeholders";
import { mediaUrl } from "@/lib/media";

/**
 * "A thousand shots": a tilted field of film frames drifting slowly through dark space, most dim and soft,
 * one in the centre sharp and glowing violet. Uses the real posters. CSS 3D only; static in lite mode.
 */
export function FrameField({ className = "" }: { className?: string }) {
  const data = useSiteData();
  const tiles = useMemo(() => {
    const ps = siteProjects(data.projects);
    const out: { key: string; src?: string; bg: string }[] = [];
    for (let i = 0; i < 42; i++) {
      const p = ps[i % Math.max(1, ps.length)];
      out.push({ key: `${i}`, src: p?.poster_url ? mediaUrl(p.poster_url) : undefined, bg: p ? artFor(p.id + i, p.discipline) : "#100E1A" });
    }
    return out;
  }, [data.projects]);
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden [perspective:1100px] ${className}`}>
      <div className="absolute left-1/2 top-1/2 w-[160vw] [transform-style:preserve-3d]" style={{ transform: "translate(-50%,-50%) rotateX(42deg) rotateZ(-9deg)" }}>
        <div data-drift className="grid grid-cols-7 gap-4" style={{ animation: "frame-drift 60s linear infinite" }}>
          {[...tiles, ...tiles].map((t, i) => {
            const centre = i === 24;
            const sharp = centre || i % 9 === 4;
            return (
              <div key={i} className={`lite-noblur aspect-video overflow-hidden rounded-md border ${centre ? "border-violet shadow-[0_0_60px_rgba(124,58,237,.9)]" : "border-line/60"}`}
                style={{ opacity: centre ? 0.95 : sharp ? 0.5 : 0.26, filter: sharp ? "none" : `blur(${1.5 + (i % 3)}px)`, background: t.bg }}>
                {t.src && <img src={t.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_center,rgba(7,6,13,.82)_0%,rgba(7,6,13,.55)_60%,rgba(7,6,13,.7)_100%)]" />
    </div>
  );
}
