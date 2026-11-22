import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { reducedMotion } from "@/motion/useReducedMotion";

export type WebGLState = { ready: boolean; enabled: boolean; tier: number; mobile: boolean };
const Ctx = createContext<WebGLState>({ ready: false, enabled: false, tier: 0, mobile: false });
export const useWebGL = () => useContext(Ctx);

const KEY = "xp-gpu-tier";

function supportsWebGL2() {
  try { return Boolean(document.createElement("canvas").getContext("webgl2")); } catch { return false; }
}

/** Decides once per session whether the 3D layer runs: WebGL2 + detect-gpu tier >= 2 + no reduced motion. */
export function WebGLProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WebGLState>({ ready: false, enabled: false, tier: 0, mobile: false });
  useEffect(() => {
    let alive = true;
    const forced = new URLSearchParams(location.search).get("webgl");
    const done = (tier: number, mobile: boolean) => {
      if (!alive) return;
      const enabled = forced === "1" || (forced !== "0" && tier >= 2 && !reducedMotion() && supportsWebGL2());
      setState({ ready: true, enabled, tier, mobile });
    };
    try {
      const cached = sessionStorage.getItem(KEY);
      if (cached) { const c = JSON.parse(cached); done(c.tier, c.mobile); return; }
    } catch { /* ignore */ }
    if (!supportsWebGL2()) { done(0, false); return; }
    import("detect-gpu")
      .then(({ getGPUTier }) => getGPUTier({ failIfMajorPerformanceCaveat: true }))
      .then((r) => {
        const tier = r.tier ?? 1;
        const mobile = Boolean(r.isMobile);
        try { sessionStorage.setItem(KEY, JSON.stringify({ tier, mobile })); } catch { /* ignore */ }
        done(tier, mobile);
      })
      .catch(() => done(2, /Mobi|Android/i.test(navigator.userAgent)));
    return () => { alive = false; };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
