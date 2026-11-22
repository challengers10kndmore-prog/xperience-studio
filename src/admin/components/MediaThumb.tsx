import { mediaUrl } from "@/lib/media";
import { ImageOff } from "lucide-react";

export function MediaThumb({ src, className = "h-12 w-20" }: { src?: string | null; className?: string }) {
  const url = mediaUrl(src);
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-md border border-line bg-graphite`}>
      {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-ash/50"><ImageOff className="size-4" /></div>}
    </div>
  );
}
