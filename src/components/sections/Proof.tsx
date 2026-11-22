import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useSiteData } from "@/data/DataProvider";
import type { Brand, Stat, Testimonial } from "@/data/types";
import { siteProjects } from "@/data/placeholders";
import { gsap, useGSAP } from "@/motion/gsap";
import { hasFinePointer, reducedMotion } from "@/motion/useReducedMotion";
import { mediaUrl } from "@/lib/media";
import { SectionMedia } from "@/components/media/SectionMedia";
import { LazyVideo } from "@/components/media/LazyVideo";
import { ProjectMedia } from "@/components/media/ProjectMedia";
import { usePlayer } from "@/components/media/Player";
import { SectionHeader } from "./SectionHeader";

export function Proof() {
  const data = useSiteData();
  const [brand, setBrand] = useState<Brand | null>(null);
  return (
    <section id="proof" aria-labelledby="proof-title" className="section relative py-32 md:py-40">
      <SectionMedia sectionKey="proof" />
      <SectionHeader index="09" eyebrow="Proof" title={data.settings.copy.proof.headline} />
      <Stats stats={data.settings.stats} />
      <TrustedBy brands={data.brands} onOpen={setBrand} />
      <Testimonials items={data.testimonials} />
      {brand && <BrandDrawer brand={brand} onClose={() => setBrand(null)} />}
    </section>
  );
}

function Stats({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDListElement>(null);
  useGSAP(() => {
    const els = gsap.utils.toArray<HTMLElement>("[data-stat]", ref.current!);
    els.forEach((el, i) => {
      const s = stats[i];
      const final = s.todo ? "TBC" : `${s.prefix ?? ""}${s.value.toLocaleString()}${s.suffix ?? ""}`;
      if (reducedMotion()) { el.textContent = final; return; }
      gsap.to(el, {
        duration: 2.2, delay: i * 0.15, ease: "none",
        scrambleText: { text: final, chars: "0123456789", revealDelay: 0.6, speed: 0.6 },
        scrollTrigger: { trigger: ref.current, start: "top 80%" },
      });
    });
  }, { scope: ref, dependencies: [stats] });
  return (
    <dl ref={ref} className="content mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.key} className="bg-carbon/90 p-6 backdrop-blur md:p-8">
          <dt className="eyebrow mb-4 flex items-center gap-2">{s.label}{s.todo && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[0.5rem] text-amber-200">TODO</span>}</dt>
          <dd className="timecode text-[clamp(2rem,4.5vw,3.6rem)] leading-none text-chrome" data-stat aria-label={s.todo ? "To be confirmed" : `${s.prefix ?? ""}${s.value}${s.suffix ?? ""}`}>00</dd>
        </div>
      ))}
    </dl>
  );
}

function TrustedBy({ brands, onOpen }: { brands: Brand[]; onOpen: (b: Brand) => void }) {
  const ref = useRef<HTMLUListElement>(null);
  useGSAP(() => {
    gsap.from("[data-brand]", { opacity: 0, filter: "blur(14px)", y: 30, duration: 1.2, stagger: 0.12, ease: "expo", scrollTrigger: { trigger: ref.current, start: "top 85%" } });
  }, { scope: ref });
  const tilt = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!hasFinePointer() || reducedMotion()) return;
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`); el.style.setProperty("--my", `${y * 100}%`);
    gsap.to(el, { rotateY: (x - 0.5) * 14, rotateX: -(y - 0.5) * 14, transformPerspective: 800, duration: 0.5, ease: "power3" });
  };
  return (
    <div className="content mt-24">
      <p className="eyebrow mb-8">Trusted by</p>
      <ul ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {brands.map((b) => (
          <li key={b.id} data-brand>
            <button type="button" data-cursor="view" onClick={() => onOpen(b)} onPointerMove={tilt}
              onPointerLeave={(e) => gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: 0.8 })}
              className="brand-card group relative flex h-44 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-line bg-carbon/80 p-6 text-center backdrop-blur">
              {b.logo_url ? (
                <img src={mediaUrl(b.logo_url)} alt={b.name} loading="lazy" className="max-h-14 max-w-[70%] object-contain opacity-80 brightness-[1.6] grayscale transition duration-500 group-hover:opacity-100 group-hover:brightness-100 group-hover:grayscale-0" />
              ) : (
                <span className="font-display text-3xl font-semibold text-chrome/70 transition duration-500 group-hover:text-transparent group-hover:[background:var(--brand-gradient)] group-hover:[-webkit-background-clip:text] group-hover:[background-clip:text]">{b.name}</span>
              )}
              {b.line && <span className="text-xs text-ash">{b.line}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BrandDrawer({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const data = useSiteData();
  const open = usePlayer();
  const vids = useMemo(() => siteProjects(data.projects).filter((p) => p.brand_id === brand.id && !p.placeholder), [data.projects, brand.id]);
  const panel = useRef<HTMLDivElement>(null);
  useGSAP(() => { gsap.from(panel.current, { xPercent: 100, duration: 0.8, ease: "expo" }); panel.current?.focus(); });
  const close = () => gsap.to(panel.current, { xPercent: 100, duration: 0.45, ease: "power2.in", onComplete: onClose });
  return createPortal(
    <div className="fixed inset-0 z-[250] bg-void/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === "Escape" && close()}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${brand.name} videos`} className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col gap-6 overflow-y-auto border-l border-line bg-carbon p-6 outline-none md:p-10">
        <div className="flex items-start justify-between">
          <div><p className="eyebrow mb-2">Client</p><h3 className="font-display text-4xl font-semibold">{brand.name}</h3>{brand.line && <p className="mt-2 text-ash">{brand.line}</p>}</div>
          <button onClick={close} className="btn btn-ghost !p-3" aria-label="Close"><X className="size-5" /></button>
        </div>
        {vids.length === 0 ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ash">Videos for {brand.name} are on the way.</p> : (
          <ul className="grid gap-4">
            {vids.map((p) => (
              <li key={p.id}>
                <button className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-line text-left" data-cursor="play" onClick={(e) => open(p, e.currentTarget)}>
                  <ProjectMedia p={p} />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void p-4 font-display text-xl">{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Testimonials({ items }: { items: Testimonial[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    const cards = gsap.utils.toArray<HTMLElement>("[data-tcard]", ref.current!);
    cards.forEach((c, i) => {
      if (i === cards.length - 1) return;
      gsap.to(c, { scale: 0.92, opacity: 0.5, filter: "blur(2px)", ease: "none", scrollTrigger: { trigger: cards[i + 1], start: "top 85%", end: "top 25%", scrub: true } });
    });
  }, { scope: ref, dependencies: [items.length] });
  if (!items.length) return null;
  return (
    <div className="content mt-24">
      <p className="eyebrow mb-8">What clients say</p>
      <ol ref={ref} className="space-y-6">
        {items.map((t, i) => (
          <li key={t.id} data-tcard className="sticky rounded-3xl border border-line bg-carbon p-8 shadow-[0_-20px_60px_-20px_rgba(0,0,0,.8)] md:p-12" style={{ top: `calc(var(--nav-h) + ${i * 18}px)` }}>
            <div className={`grid gap-8 ${t.video_url ? "md:grid-cols-[1fr_320px]" : ""}`}>
              <blockquote>
                {t.quote && <p className="font-display text-[clamp(1.5rem,3vw,2.6rem)] font-medium leading-tight">“{t.quote}”</p>}
                <footer className="mt-6 text-sm text-ash"><span className="text-chrome">{t.name}</span>{t.role ? `, ${t.role}` : ""}{t.company ? ` · ${t.company}` : ""}</footer>
              </blockquote>
              {t.video_url && <div className="aspect-[4/5] overflow-hidden rounded-2xl"><LazyVideo src={t.video_url} poster={t.poster_url} controls muted={false} autoPlayInView={false} className="h-full w-full object-cover" /></div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
