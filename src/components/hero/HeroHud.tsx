import { useEffect, useRef, type MutableRefObject } from "react";
import { isLite } from "@/lib/perf";

/** Cinematic viewfinder over the hero: corner brackets, REC + running timecode, format readout, assembly meter. */
export function HeroHud({ progress, cx }: { progress: MutableRefObject<number>; cx: number }) {
  const tc = useRef<HTMLSpanElement>(null);
  const meter = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0; const t0 = performance.now(); let lastTxt = "";
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      const f = Math.floor((s % 1) * 24);
      const txt = [Math.floor(s / 3600), Math.floor(s / 60) % 60, Math.floor(s) % 60, f].map((n) => String(n).padStart(2, "0")).join(":");
      if (txt !== lastTxt && tc.current) { tc.current.textContent = txt; lastTxt = txt; }
      const p = Math.round(Math.min(1, Math.max(0, progress.current)) * 100);
      if (meter.current) meter.current.style.transform = `scaleX(${p / 100})`;
      if (pct.current) pct.current.textContent = String(p).padStart(3, "0");
      raf = requestAnimationFrame(tick);
    };
    if (!isLite()) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);
  const corner = "absolute h-7 w-7 border-chrome/50";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[4] hidden md:block">
      {/* viewfinder around the figure */}
      <div className="absolute top-[16%] bottom-[14%]" style={{ left: `${(cx - 0.2) * 100}%`, right: `${(1 - cx - 0.2) * 100}%` }}>
        <span className={`${corner} left-0 top-0 border-l border-t`} /><span className={`${corner} right-0 top-0 border-r border-t`} />
        <span className={`${corner} bottom-0 left-0 border-b border-l`} /><span className={`${corner} bottom-0 right-0 border-b border-r`} />
        <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-chrome/40" /><span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-chrome/40" />
        <div className="timecode absolute -top-7 left-0 flex items-center gap-2 text-[11px] text-chrome/80">
          <span className="size-2 animate-pulse rounded-full bg-[#ff3b5c] shadow-[0_0_10px_#ff3b5c]" /> REC <span ref={tc}>00:00:00:00</span>
        </div>
        <div className="timecode absolute -top-7 right-0 text-[11px] text-ash">4K · 24 FPS · ISO 800</div>
        <div className="absolute -bottom-8 left-0 right-0 flex items-center gap-3">
          <span className="timecode text-[11px] text-ash">ASSEMBLY</span>
          <span className="relative h-px flex-1 bg-chrome/15"><span ref={meter} className="absolute inset-0 origin-left bg-[linear-gradient(90deg,#C84BFF,#7C3AED,#2F6BFF)] shadow-[0_0_8px_#7C3AED]" style={{ transform: "scaleX(0)" }} /></span>
          <span className="timecode text-[11px] text-chrome/80"><span ref={pct}>000</span>%</span>
        </div>
      </div>
    </div>
  );
}
