import { XperienceLogo } from "./XperienceLogo";

/**
 * The footer's "logo over a reflective neon floor with fog", without WebGL, so it can be used anywhere:
 * chrome mark + violet/blue glow + mirrored reflection fading into a lit floor. Gently floats (off in lite mode).
 */
export function LogoStage({ size = "md", className = "", label }: { size?: "sm" | "md" | "lg"; className?: string; label?: string }) {
  const w = size === "lg" ? "w-[min(340px,60vw)]" : size === "md" ? "w-[min(180px,40vw)]" : "w-14";
  return (
    <div aria-hidden className={`pointer-events-none relative flex flex-col items-center ${className}`}>
      <div className={`relative ${w}`}>
        {/* floor light, right under the mark */}
        <div className="absolute left-1/2 top-[88%] h-[26%] w-[170%] -translate-x-1/2 rounded-[50%]"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(124,58,237,.6), rgba(47,107,255,.2) 45%, transparent 70%)", filter: "blur(6px)" }} />
      <div className="relative" data-drift style={{ animation: "logo-float 6s ease-in-out infinite" }}>
        <div className="absolute inset-[12%] rounded-full" style={{ background: "radial-gradient(circle, rgba(124,58,237,.55), rgba(47,107,255,.2) 45%, transparent 70%)", filter: "blur(18px)" }} />
        <XperienceLogo variant="mark" className="relative w-full drop-shadow-[0_0_24px_rgba(124,58,237,.55)]" />
      </div>
      </div>
      {/* reflection on the floor */}
      {size !== "sm" && (
        <div className={`relative -mt-[6%] ${w} opacity-30`} style={{ transform: "scaleY(-0.55)", transformOrigin: "top", maskImage: "linear-gradient(to bottom, rgba(0,0,0,.9), transparent 70%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,.9), transparent 70%)", filter: "blur(1.5px)" }}>
          <XperienceLogo variant="mark" className="w-full" />
        </div>
      )}
      {label && <p className="eyebrow relative mt-2">{label}</p>}
    </div>
  );
}

/** Small chrome emblem for card corners and section eyebrows. */
export function MarkEmblem({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative inline-grid place-items-center ${className}`}>
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,.5),transparent_70%)] blur-[3px]" />
      <XperienceLogo variant="mark" className="relative h-full w-full" />
    </span>
  );
}
