import { useEffect, useRef, useState, type PointerEvent as RPE, type KeyboardEvent } from "react";
import { useSiteData } from "@/data/DataProvider";
import type { BeforeAfter as Pair } from "@/data/types";
import { mediaUrl } from "@/lib/media";
import { useInView } from "@/hooks/useInView";
import { SectionHeader } from "./SectionHeader";

const placeholder: Pair = { id: "ph", title: "Placeholder pair", label: "Placeholder", description: "Upload a raw and a final clip in admin > Before / After.", before_url: null, after_url: null, poster_url: null, sort_order: 0, published: true, media_status: "published", media_synced_at: null, created_at: "", updated_at: "" };

/** Synced dual-video wipe slider with tabs per pair. Drag, click or use arrow keys. */
export function BeforeAfter() {
  const data = useSiteData();
  const pairs = data.beforeAfter.length ? data.beforeAfter : [placeholder];
  const copy = data.settings.copy.beforeAfter;
  const [i, setI] = useState(0);
  const pair = pairs[Math.min(i, pairs.length - 1)];
  return (
    <section id="before-after" aria-labelledby="ba-title" className="section py-32 md:py-40">
      <SectionHeader index="05" eyebrow="Before / After" title={copy.headline} sub={copy.sub} />
      {pairs.length > 1 && (
        <div role="tablist" aria-label="Before and after pairs" className="content mt-10 flex flex-wrap gap-2">
          {pairs.map((p, k) => <button key={p.id} role="tab" aria-selected={k === i} aria-pressed={k === i} className="chip" onClick={() => setI(k)}>{p.label || p.title}</button>)}
        </div>
      )}
      <Wipe key={pair.id} pair={pair} />
      {pair.description && <p className="content mt-4 max-w-xl text-sm text-ash">{pair.description}</p>}
    </section>
  );
}

function Wipe({ pair }: { pair: Pair }) {
  const box = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const [pos, setPos] = useState(50);
  const [drag, setDrag] = useState(false);
  const visible = useInView(box, "100px");
  const near = useInView(box, "400px", true);
  const before = mediaUrl(pair.before_url), after = mediaUrl(pair.after_url);

  // keep the two videos frame-locked: B follows A's clock
  useEffect(() => {
    const va = a.current, vb = b.current;
    if (!va || !vb || !before || !after) return;
    if (visible) { va.play().catch(() => {}); vb.play().catch(() => {}); } else { va.pause(); vb.pause(); }
    let raf = 0;
    const sync = () => { if (Math.abs(vb.currentTime - va.currentTime) > 0.06) vb.currentTime = va.currentTime; raf = requestAnimationFrame(sync); };
    if (visible) raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [visible, before, after]);

  const fromEvent = (e: RPE) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
    if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
  };

  const ph = !before || !after;
  return (
    <div ref={box} className="content relative mt-10 aspect-video w-full touch-pan-y select-none overflow-hidden rounded-2xl border border-line bg-carbon"
      data-cursor="drag" onPointerDown={(e) => { setDrag(true); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); fromEvent(e); }}
      onPointerMove={(e) => drag && fromEvent(e)} onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)}>
      {/* after (final) underneath, before (raw) clipped on top */}
      {ph ? <div className="media-placeholder absolute inset-0" /> : <video ref={b} src={near ? after : undefined} poster={mediaUrl(pair.poster_url)} muted playsInline loop preload="none" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {ph ? <div className="media-placeholder absolute inset-0 contrast-75 grayscale" /> : <video ref={a} src={near ? before : undefined} muted playsInline loop preload="none" className="absolute inset-0 h-full w-full object-cover" />}
      </div>
      <span className="eyebrow absolute left-4 top-4 rounded-full bg-void/70 px-3 py-1.5 backdrop-blur">Raw</span>
      <span className="eyebrow absolute right-4 top-4 rounded-full bg-void/70 px-3 py-1.5 backdrop-blur">Final</span>
      {ph && <span className="chip absolute bottom-4 left-4 !border-amber-400/40 !text-amber-200">Placeholder</span>}
      <div className="absolute inset-y-0 w-px bg-chrome shadow-[0_0_16px_#C84BFF]" style={{ left: `${pos}%` }}>
        <div role="slider" tabIndex={0} aria-label="Before and after divider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)} onKeyDown={key}
          className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-chrome/60 bg-void/80 font-mono text-xs backdrop-blur">
          ⟷
        </div>
      </div>
    </div>
  );
}
