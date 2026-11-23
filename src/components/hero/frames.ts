import { mediaUrl } from "@/lib/media";
import type { SectionMedia } from "@/data/types";

export type FrameSet = { path: string; count: number; w: number; h: number; ext: string; pattern?: string };
export type Variant = "desktop" | "mobile";

export function frameSetFor(row: SectionMedia | undefined, variant: Variant): FrameSet | null {
  const f = (row?.frames ?? {}) as Partial<Record<Variant, FrameSet>>;
  const pick = f[variant] ?? f[variant === "desktop" ? "mobile" : "desktop"];
  return pick && pick.count > 1 && pick.path ? pick : null;
}

export const frameUrl = (set: FrameSet, i: number) => mediaUrl(`${set.path}/f${String(i + 1).padStart(3, "0")}.${set.ext || "webp"}`)!;

/** Load order: last + first, then every 8th, 4th, 2nd, then the rest, so scrubbing works early and sharpens as it loads. */
export function loadOrder(count: number) {
  const seen = new Set<number>(); const out: number[] = [];
  const push = (i: number) => { if (i >= 0 && i < count && !seen.has(i)) { seen.add(i); out.push(i); } };
  push(count - 1); push(0);
  for (const step of [8, 4, 2, 1]) for (let i = 0; i < count; i += step) push(i);
  return out;
}

/** Nearest loaded frame to `i` (searching outward). */
export function nearestLoaded(frames: (HTMLImageElement | null)[], i: number) {
  for (let d = 0; d < frames.length; d++) {
    if (frames[i - d]) return frames[i - d];
    if (frames[i + d]) return frames[i + d];
  }
  return null;
}

/** Cover-fit draw (like object-fit: cover), anchored right of centre on wide screens so the left third stays for copy. */
export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, cw: number, ch: number, anchorX = 0.5) {
  const s = Math.max(cw / iw, ch / ih);
  const w = iw * s, h = ih * s;
  ctx.drawImage(img, (cw - w) * anchorX, (ch - h) / 2, w, h);
}
