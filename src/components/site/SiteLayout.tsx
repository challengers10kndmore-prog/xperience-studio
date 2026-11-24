import { lazy, Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSite } from "@/data/DataProvider";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { Maintenance } from "./Maintenance";
import { XWipeProvider } from "./XWipe";
import { Ignition } from "@/components/brand/Ignition";
import { PlayerProvider } from "@/components/media/Player";
import { SmoothScroll } from "@/motion/SmoothScroll";
import { Cursor } from "@/motion/Cursor";
import { ScrollTrigger } from "@/motion/gsap";
import { WebGLProvider, useWebGL } from "@/three/webgl";
import { trackPageView } from "@/lib/analytics";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const SharedCanvas = lazy(() => import("@/three/SharedCanvas"));

export function SiteLayout() {
  const { maintenance, data, isLoading } = useSite();
  const { pathname } = useLocation();
  const [igniting, setIgniting] = useState(() => pathname === "/");
  const [replayKey, setReplayKey] = useState(0);
  useDocumentMeta({ title: data.settings.seo_title ?? undefined, description: data.settings.seo_description ?? undefined });
  useEffect(() => { trackPageView(pathname); }, [pathname]);
  useEffect(() => { if (!igniting) document.documentElement.classList.remove("is-loading"); }, [igniting]);
  useEffect(() => {
    const replay = () => { window.scrollTo(0, 0); setReplayKey((k) => k + 1); setIgniting(true); };
    window.addEventListener("xp:ignite", replay);
    return () => window.removeEventListener("xp:ignite", replay);
  }, []);
  // layout settles after data arrives: recompute every pin/trigger
  useEffect(() => { const t = setTimeout(() => ScrollTrigger.refresh(), 300); return () => clearTimeout(t); }, [isLoading, pathname]);

  if (maintenance.enabled && !isAdminPreview()) return <Maintenance message={maintenance.message} />;
  return (
    <WebGLProvider>
      <SmoothScroll>
        <XWipeProvider>
          <PlayerProvider projects={data.projects}>
            <a href="#main" data-small-ok className="sr-only-focusable fixed left-4 top-4 z-[600] rounded bg-violet px-4 py-3 text-white">Skip to content</a>
            <Nav markHidden={igniting} />
            <main id="main">
              <Outlet />
            </main>
            <Footer />
            <GL />
            <Cursor />
            <div className="grain" aria-hidden />
            {igniting && <Ignition key={replayKey} replay={replayKey > 0} onDone={() => setIgniting(false)} />}
          </PlayerProvider>
        </XWipeProvider>
      </SmoothScroll>
    </WebGLProvider>
  );
}

function GL() {
  const gl = useWebGL();
  if (!gl.enabled) return null;
  return <Suspense fallback={null}><SharedCanvas mobile={gl.mobile} /></Suspense>;
}

function isAdminPreview() {
  try { return Boolean(localStorage.getItem("xp-admin-auth")); } catch { return false; }
}
