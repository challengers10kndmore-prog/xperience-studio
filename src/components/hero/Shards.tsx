import { forwardRef } from "react";
import { mediaUrl } from "@/lib/media";
import { artFor, type SiteProject } from "@/data/placeholders";

/** Featured films as flat cards; HeroVideo positions them in CSS 3D every frame (no WebGL). */
export const Shards = forwardRef<HTMLDivElement, { films: SiteProject[]; onOpen: (p: SiteProject, el: HTMLElement) => void }>(
  function Shards({ films, onOpen }, ref) {
    return (
      <div ref={ref} className="pointer-events-none absolute inset-0 z-[6] [perspective:1200px]" aria-label="Featured films">
        {films.map((p) => (
          <button key={p.id} type="button" data-shard data-cursor="play"
            onClick={(e) => onOpen(p, e.currentTarget)}
            className="group absolute left-0 top-0 block overflow-hidden rounded-lg border border-chrome/20 bg-carbon opacity-0 shadow-[0_20px_60px_-20px_rgba(124,58,237,.6)] will-change-transform focus-visible:opacity-100"
            style={{ width: "var(--shard-w)", aspectRatio: p.aspect_ratio === "9:16" ? "9/16" : "16/9" }}>
            {p.poster_url ? <img src={mediaUrl(p.show_caption && p.cover_url ? p.cover_url : p.poster_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              : <span className="block h-full w-full" style={{ background: artFor(p.id, p.discipline) }} />}
            <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-void/95 to-transparent px-2.5 pb-2 pt-6 text-left font-label text-[0.5rem] tracking-[0.18em] text-chrome transition-transform duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0">
              {p.title.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    );
  },
);
