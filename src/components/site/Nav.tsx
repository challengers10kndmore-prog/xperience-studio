import { Link } from "react-router-dom";
import { XperienceLogo } from "@/components/brand/XperienceLogo";

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-[80] flex h-[var(--nav-h)] items-center justify-between px-[clamp(1.25rem,4vw,4rem)]">
      <Link to="/" aria-label="Xperience home" className="flex items-center gap-3">
        <XperienceLogo variant="mark" className="h-10 w-10" title="Xperience" />
        <span className="font-label text-[0.7rem] tracking-[0.3em]">XPERIENCE</span>
      </Link>
      <nav aria-label="Primary" className="flex items-center gap-6 font-label text-[0.62rem] uppercase tracking-[0.25em] text-ash">
        <a href="/#work" className="hidden hover:text-chrome sm:inline">Work</a>
        <a href="/#services" className="hidden hover:text-chrome sm:inline">Services</a>
        <a href="/#contact" className="btn btn-ghost !py-2.5">Start a project</a>
      </nav>
    </header>
  );
}
