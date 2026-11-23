import { forwardRef } from "react";
import { artFor, type SiteProject } from "@/data/placeholders";
import { LazyVideo } from "./LazyVideo";
import { mediaUrl } from "@/lib/media";

/** Teaser loop (or poster, or generated art) for a project. */
export const ProjectMedia = forwardRef<HTMLVideoElement, { p: SiteProject; play?: boolean; className?: string; useFull?: boolean }>(
  function ProjectMedia({ p, play, className = "", useFull }, ref) {
    const src = useFull ? p.video_url : p.teaser_url || p.video_url;
    const poster = p.show_caption && p.cover_url ? p.cover_url : p.poster_url;
    if (!src && !poster) {
      return <div className={`h-full w-full ${className}`} style={{ background: artFor(p.id, p.discipline) }} aria-hidden />;
    }
    if (!src) return <img src={mediaUrl(poster)} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
    return <LazyVideo ref={ref} src={src} poster={poster} play={play} autoPlayInView={play === undefined} className={`h-full w-full object-cover ${className}`} />;
  },
);

export function Tags({ p, className = "" }: { p: SiteProject; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className={`chip !py-1 ${p.discipline === "ai" ? "!border-electric/50 !text-blue-200" : "!border-magenta/50 !text-fuchsia-200"}`}>{p.discipline === "ai" ? "AI Video" : "Video Editing"}</span>
      {p.is_xperience_original && <span className="tag-original">Xperience Original</span>}
      {p.placeholder && <span className="chip !border-amber-400/40 !py-1 !text-amber-200">Placeholder</span>}
    </div>
  );
}
