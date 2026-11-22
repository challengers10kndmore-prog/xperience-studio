import { useMediaQuery } from "@/hooks/useInView";
import { useSiteData } from "@/data/DataProvider";
import { LazyVideo } from "./LazyVideo";

/**
 * Section background loop: desktop 16:9 / mobile 9:16, muted, preload="none", loaded near viewport,
 * paused off-screen, gradient overlay (admin opacity) keeping the left third dark, poster fallback,
 * animated brand placeholder until a loop is uploaded.
 */
export function SectionMedia({ sectionKey, className = "", align = "left" }: { sectionKey: string; className?: string; align?: "left" | "center" }) {
  const m = useSiteData().sectionMedia[sectionKey];
  const mobile = useMediaQuery("(max-aspect-ratio: 4/5)");
  const src = m?.published ? (mobile ? m.mobile_url || m.desktop_url : m.desktop_url || m.mobile_url) : null;
  const opacity = m?.overlay_opacity ?? 0.6;
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} data-section-media={sectionKey}>
      {src ? (
        <LazyVideo src={src} poster={m?.poster_url} className="h-full w-full object-cover" />
      ) : (
        <div className="media-placeholder h-full w-full" data-placeholder />
      )}
      <div className="absolute inset-0" style={{
        background: align === "left"
          ? `linear-gradient(90deg, rgba(7,6,13,${Math.min(1, opacity + 0.35)}) 0%, rgba(7,6,13,${opacity}) 33%, rgba(7,6,13,${opacity * 0.55}) 100%)`
          : `radial-gradient(ellipse at center, rgba(7,6,13,${opacity * 0.6}) 0%, rgba(7,6,13,${Math.min(1, opacity + 0.25)}) 100%)`,
      }} />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-void to-transparent" />
    </div>
  );
}
