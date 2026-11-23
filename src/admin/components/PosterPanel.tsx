import { useRef, useState } from "react";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mediaUrl } from "@/lib/media";
import { formatDuration } from "@/lib/utils";
import type { AnyRow } from "../db";
import type { Resource } from "../resources";
import { queueForSync } from "../save";

/** Poster + cover card preview, with "pick a different frame" (time slider over the published video). */
export function PosterPanel({ res, row, onQueued }: { res: Resource; row: AnyRow; onQueued: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState<number>(Number(row.poster_time ?? 0));
  const [busy, setBusy] = useState(false);
  const src = mediaUrl(row.video_url as string | null);
  const dur = Number(row.duration_s ?? 0);
  const id = String(row[res.pk]);
  if (!src) return null;
  const queue = async (add: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try { await queueForSync(res, id, add); toast.success(msg); onQueued(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <Label>Poster and cover card</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="space-y-1">
          <div className="aspect-video overflow-hidden rounded bg-graphite">{row.poster_url ? <img src={`${mediaUrl(row.poster_url as string)}?v=${encodeURIComponent(String(row.media_synced_at ?? ""))}`} alt="Poster" className="h-full w-full object-contain" /> : null}</div>
          <figcaption className="text-[11px] text-ash">Poster (clean) · {row.poster_source === "upload" ? "your upload" : row.poster_source === "time" ? `frame at ${Number(row.poster_time).toFixed(1)} s` : "picked automatically"}</figcaption>
        </figure>
        <figure className="space-y-1">
          <div className="aspect-video overflow-hidden rounded bg-graphite">{row.cover_url ? <img src={`${mediaUrl(row.cover_url as string)}?v=${encodeURIComponent(String(row.media_synced_at ?? ""))}`} alt="Cover card" className="h-full w-full object-contain" /> : <p className="grid h-full place-items-center text-xs text-ash">Made on next publish</p>}</div>
          <figcaption className="text-[11px] text-ash">Cover card (caption baked in) · used for link previews{row.og_url ? <> · <a className="underline" href={mediaUrl(row.og_url as string)} target="_blank" rel="noreferrer">share card</a></> : null}</figcaption>
        </figure>
      </div>
      <div className="space-y-2 rounded-md bg-void/50 p-2">
        <p className="text-xs text-ash">Pick a different frame</p>
        <video ref={video} src={src} muted playsInline preload="metadata" crossOrigin="anonymous" className="aspect-video w-full rounded bg-black object-contain" />
        <input type="range" min={0} max={Math.max(0.1, dur || video.current?.duration || 1)} step={0.04} value={t} aria-label="Poster time"
          onChange={(e) => { const v = Number(e.target.value); setT(v); if (video.current) video.current.currentTime = v; }} className="w-full accent-violet" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="timecode text-xs text-ash">{formatDuration(t)} · {t.toFixed(2)} s</span>
          <Button type="button" size="sm" disabled={busy} onClick={() => queue({ _poster: { at: t } }, "Using this frame. The poster and cover update in a few minutes.")}>Use this frame</Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => queue({ _poster: { auto: true } }, "Picking the best frame automatically…")}><Wand2 /> Pick automatically</Button>
        </div>
      </div>
      <p className="text-[11px] text-ash">To use your own image instead, upload it in “Poster image” below and save.</p>
    </div>
  );
}
