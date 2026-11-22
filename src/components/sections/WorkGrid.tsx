import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { Flip, gsap } from "@/motion/gsap";
import { hasFinePointer, reducedMotion } from "@/motion/useReducedMotion";
import type { SiteProject } from "@/data/placeholders";
import { ProjectMedia, Tags } from "@/components/media/ProjectMedia";
import { usePlayer } from "@/components/media/Player";
import { formatDuration } from "@/lib/utils";

type Filter = { discipline: "all" | "ai" | "editing"; category: string | null; format: string | null; originals: boolean };

const FORMAT_LABEL: Record<string, string> = { "16:9": "Landscape", "9:16": "Vertical", "1:1": "Square", "4:5": "Portrait", "21:9": "Cinema" };
const pretty = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Masonry of projects with filter chips (Flip-animated) and hover autoplay + tilt. */
export function WorkGrid({ projects, lockDiscipline, initialCategory = null }: { projects: SiteProject[]; lockDiscipline?: "ai" | "editing"; initialCategory?: string | null }) {
  const [f, setF] = useState<Filter>({ discipline: lockDiscipline ?? "all", category: initialCategory, format: null, originals: false });
  const grid = useRef<HTMLUListElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  const scope = lockDiscipline ? projects.filter((p) => p.discipline === lockDiscipline) : projects;
  const categories = useMemo(() => [...new Set(scope.filter((p) => f.discipline === "all" || p.discipline === f.discipline).map((p) => p.category).filter(Boolean))] as string[], [scope, f.discipline]);
  const formats = useMemo(() => [...new Set(scope.map((p) => p.aspect_ratio))], [scope]);
  const shown = scope.filter((p) =>
    (f.discipline === "all" || p.discipline === f.discipline) && (!f.category || p.category === f.category) && (!f.format || p.aspect_ratio === f.format) && (!f.originals || p.is_xperience_original));

  const update = (patch: Partial<Filter>) => {
    if (grid.current && !reducedMotion()) flipState.current = Flip.getState(grid.current.querySelectorAll("[data-card]"));
    setF((x) => ({ ...x, ...patch }));
  };

  useLayoutEffect(() => {
    if (!flipState.current) return;
    Flip.from(flipState.current, {
      duration: 0.8, ease: "expo", absolute: true, scale: true, nested: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.4 }),
    });
    flipState.current = null;
  }, [shown.length, f]);

  const chip = (label: string, pressed: boolean, onClick: () => void) => (
    <button key={label} type="button" className="chip" aria-pressed={pressed} onClick={onClick}>{label}</button>
  );

  return (
    <div className="content">
      <div className="mb-10 flex flex-wrap items-center gap-2" role="group" aria-label="Filter work">
        {!lockDiscipline && (["all", "ai", "editing"] as const).map((d) => chip(d === "all" ? "All" : d === "ai" ? "AI Video" : "Video Editing", f.discipline === d, () => update({ discipline: d, category: null })))}
        {!lockDiscipline && <span className="mx-1 h-5 w-px bg-line" aria-hidden />}
        {categories.map((c) => chip(pretty(c), f.category === c, () => update({ category: f.category === c ? null : c })))}
        {formats.length > 1 && <span className="mx-1 h-5 w-px bg-line" aria-hidden />}
        {formats.length > 1 && formats.map((x) => chip(FORMAT_LABEL[x] ?? x, f.format === x, () => update({ format: f.format === x ? null : x })))}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {chip("Xperience Originals", f.originals, () => update({ originals: !f.originals }))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-ash">Nothing in this filter yet.</p>
      ) : (
        <ul ref={grid} className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5">
          {shown.map((p) => <Card key={p.id} p={p} />)}
        </ul>
      )}
    </div>
  );
}

const RATIO: Record<string, string> = { "16:9": "16/9", "9:16": "9/16", "1:1": "1/1", "4:5": "4/5", "21:9": "21/9" };

function Card({ p }: { p: SiteProject }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const open = usePlayer();
  const tilt = (e: React.PointerEvent) => {
    if (!hasFinePointer() || reducedMotion() || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(ref.current, { rotateY: x * 8, rotateX: -y * 8, duration: 0.6, ease: "power3", transformPerspective: 900 });
  };
  return (
    <li data-card data-flip-id={p.id} className="break-inside-avoid">
      <button ref={ref} type="button" data-cursor="play"
        onClick={() => open(p, ref.current)} onPointerEnter={() => setHover(true)} onPointerMove={tilt}
        onPointerLeave={() => { setHover(false); if (ref.current) gsap.to(ref.current, { rotateX: 0, rotateY: 0, duration: 0.8 }); }}
        onFocus={() => setHover(true)} onBlur={() => setHover(false)}
        className="group relative block w-full overflow-hidden rounded-xl border border-line bg-carbon text-left will-change-transform [transform-style:preserve-3d]">
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: RATIO[p.aspect_ratio] ?? "16/9" }}>
          <ProjectMedia p={p} play={hover} className="transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/10 to-transparent" />
          <span className="timecode absolute right-3 top-3 rounded bg-void/70 px-2 py-0.5 text-[11px] text-chrome/80 backdrop-blur">{formatDuration(p.duration_s)}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
          <Tags p={p} />
          <h3 className="font-display text-xl font-semibold leading-tight md:text-2xl"><span className="sr-only">Play </span>{p.title}</h3>
          {p.category && <p className="eyebrow !text-[0.58rem]">{pretty(p.category)}</p>}
        </div>
      </button>
    </li>
  );
}
