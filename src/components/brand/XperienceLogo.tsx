import { forwardRef, useId, type SVGProps } from "react";
import { BLADE_PATH, BLADE_SPINE, MARK, bladeTransform } from "./logoGeometry";

type Props = SVGProps<SVGSVGElement> & {
  /** "full" = mark + wordmark + tagline; "mark" = ring + blades only; "wordmark" = words + rules + tagline only. */
  variant?: "full" | "mark" | "wordmark";
  title?: string;
};

/**
 * Layered Xperience logo. Every layer carries data-part so GSAP can animate it:
 * ring, blade-left, blade-right, word-xperience, word-game, rule-left, rule-right, tagline.
 */
export const XperienceLogo = forwardRef<SVGSVGElement, Props>(function XperienceLogo(
  { variant = "full", title = "Xperience", ...rest },
  ref,
) {
  const uid = useId().replace(/[:]/g, "");
  const g = (n: string) => `${n}-${uid}`;
  const full = variant !== "mark";
  const showMark = variant !== "wordmark";
  const viewBox = variant === "full" ? "0 0 400 560" : variant === "mark" ? "0 0 400 400" : "0 400 400 160";
  return (
    <svg ref={ref} viewBox={viewBox} role="img" aria-label={title} {...rest}>
      <title>{title}</title>
      <defs>
        <linearGradient id={g("brand")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C84BFF" />
          <stop offset="0.5" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#2F6BFF" />
        </linearGradient>
        <linearGradient id={g("chrome")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5B5F73" />
          <stop offset="0.28" stopColor="#F4F5F8" />
          <stop offset="0.5" stopColor="#A7ACBE" />
          <stop offset="0.72" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#4A4D5E" />
        </linearGradient>
        <linearGradient id={g("sweep")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={g("glow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={g("bladeclip")}>
          <path d={BLADE_PATH} transform={bladeTransform("left")} />
          <path d={BLADE_PATH} transform={bladeTransform("right")} />
        </clipPath>
      </defs>

      {showMark && <g data-part="mark">
        <circle data-part="ring" cx={MARK.cx} cy={MARK.cy} r={MARK.ringR} fill="none" stroke={`url(#${g("brand")})`}
          strokeWidth={MARK.ringW} filter={`url(#${g("glow")})`} pathLength={1} />
        <g data-part="blade-left">
          <g transform={bladeTransform("left")}>
            <path d={BLADE_PATH} fill={`url(#${g("chrome")})`} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
            <path d={BLADE_SPINE} fill="#ffffff" fillOpacity="0.55" />
          </g>
        </g>
        <g data-part="blade-right">
          <g transform={bladeTransform("right")}>
            <path d={BLADE_PATH} fill={`url(#${g("chrome")})`} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
            <path d={BLADE_SPINE} fill="#ffffff" fillOpacity="0.55" />
          </g>
        </g>
        <g clipPath={`url(#${g("bladeclip")})`}>
          <rect data-part="sweep" x="-160" y="0" width="120" height="400" fill={`url(#${g("sweep")})`} transform="skewX(-20)" opacity="0" />
        </g>
        <circle data-part="flash" cx={MARK.cx} cy={MARK.cy} r="10" fill="#fff" opacity="0" />
      </g>}

      {full && (
        <g data-part="wordmark">
          <text data-part="word-xperience" x="200" y="448" textAnchor="middle" fill="#E6E8EE"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 58, letterSpacing: "0.04em" }}>XPERIENCE</text>
          <line data-part="rule-left" x1="70" y1="486" x2="150" y2="486" stroke={`url(#${g("brand")})`} strokeWidth="2" />
          <text data-part="word-game" x="200" y="493" textAnchor="middle" fill="#E6E8EE"
            style={{ fontFamily: "var(--font-label)", fontSize: 20, letterSpacing: "0.5em" }}>GAME</text>
          <line data-part="rule-right" x1="250" y1="486" x2="330" y2="486" stroke={`url(#${g("brand")})`} strokeWidth="2" />
          <text data-part="tagline" x="200" y="536" textAnchor="middle" fill="#8F8BA3"
            style={{ fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.32em" }}>
            <tspan data-part="tag-word">PLAY</tspan> <tspan data-part="tag-dot" fill="#C84BFF">·</tspan> <tspan data-part="tag-word">CONNECT</tspan>{" "}
            <tspan data-part="tag-dot" fill="#C84BFF">·</tspan> <tspan data-part="tag-word">EVOLVE</tspan>
          </text>
        </g>
      )}
    </svg>
  );
});
