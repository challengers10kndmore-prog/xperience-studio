import { lazy, Suspense, useRef } from "react";
import { Link } from "react-router-dom";
import { useSiteData } from "@/data/DataProvider";
import { XperienceLogo } from "@/components/brand/XperienceLogo";
import { useWebGL } from "@/three/webgl";
import { ScrollTrigger, useGSAP } from "@/motion/gsap";
import { scrollToTarget } from "@/motion/SmoothScroll";

const Footer3D = lazy(() => import("@/three/Footer3D"));

export function replayIgnition() { window.dispatchEvent(new CustomEvent("xp:ignite")); }

/** Footer: large 3D logo over a reflective neon floor with fog; blades re-assemble on enter; cursor tilt; click replays Ignition. */
export function Footer() {
  const { settings } = useSiteData();
  const gl = useWebGL();
  const stage = useRef<HTMLDivElement>(null);
  const assembly = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  useGSAP(() => {
    const st = ScrollTrigger.create({
      trigger: stage.current, start: "top 85%", end: "bottom bottom",
      onEnter: () => { assembly.current = 1; }, onLeaveBack: () => { assembly.current = 0; },
    });
    return () => st.kill();
  });

  const wa = settings.whatsapp?.replace(/\D/g, "");
  return (
    <footer className="relative overflow-hidden border-t border-line" aria-label="Footer">
      <div ref={stage} className="relative h-[70vh] min-h-[420px] w-full cursor-pointer" data-cursor="play"
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); pointer.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 }; }}
        onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}
        onClick={replayIgnition} role="button" tabIndex={0} aria-label="Replay the Xperience intro"
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && replayIgnition()}>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(124,58,237,.25),transparent_70%)]" />
        {gl.enabled ? (
          <Suspense fallback={null}><Footer3D assembly={assembly} pointer={pointer} /></Suspense>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative w-[min(300px,60vw)]">
              <XperienceLogo variant="mark" className="w-full drop-shadow-[0_0_30px_rgba(124,58,237,.6)]" />
              <XperienceLogo variant="mark" aria-hidden className="absolute left-0 top-full w-full -scale-y-100 opacity-20 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,.8),transparent_60%)]" />
            </div>
          </div>
        )}
      </div>
      <div className="section relative z-10 grid gap-10 py-14 md:grid-cols-3">
        <div className="space-y-3">
          <XperienceLogo variant="wordmark" className="w-48" />
          <p className="text-sm text-ash">{settings.credit_line}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          {[["#work", "Selected work"], ["#crafts", "Two crafts"], ["#library", "Library"], ["#process", "Process"], ["#services", "Services"], ["#contact", "Contact"]].map(([h, l]) => (
            <a key={h} href={`/${h}`} onClick={(e) => { if (location.pathname === "/") { e.preventDefault(); scrollToTarget(h); } }} className="text-ash hover:text-chrome">{l}</a>
          ))}
          <Link to="/work/ai" className="text-ash hover:text-chrome">AI Video</Link>
          <Link to="/work/editing" className="text-ash hover:text-chrome">Video Editing</Link>
        </nav>
        <div className="space-y-2 text-sm md:text-right">
          {settings.contact_email && <p><a className="hover:text-magenta" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></p>}
          {wa && <p><a className="hover:text-magenta" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a></p>}
          <p className="text-ash">© {new Date().getFullYear()} Xperience. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
