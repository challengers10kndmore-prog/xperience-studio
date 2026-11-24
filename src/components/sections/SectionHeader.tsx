import { KineticHeading } from "@/components/kinetic/KineticHeading";

/** Eyebrow (scrambles in via KineticScan) + 3D kinetic headline + sub (word-by-word blur rise). */
export function SectionHeader({ index, eyebrow, title, sub, className = "", align = "left" }: {
  index?: string; eyebrow: string; title: string; sub?: string; className?: string; align?: "left" | "center";
}) {
  return (
    <div className={`content max-w-5xl ${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      <p className="eyebrow mb-5 flex items-center gap-3" style={align === "center" ? { justifyContent: "center" } : undefined}>
        {index && <span className="timecode text-[0.7rem] tracking-normal text-magenta">{index}</span>}{eyebrow}
      </p>
      <KineticHeading className="section-title text-balance">{title}</KineticHeading>
      {sub && <p data-words className="mt-6 max-w-xl text-lg text-ash" style={align === "center" ? { marginInline: "auto" } : undefined}>{sub}</p>}
    </div>
  );
}
