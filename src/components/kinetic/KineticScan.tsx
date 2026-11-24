import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { gsap, SplitText } from "@/motion/gsap";
import { reducedMotion } from "@/motion/useReducedMotion";
import { isLite } from "@/lib/perf";

const done = new WeakSet<Element>();

/**
 * Site-wide text motion for elements that don't need their own component:
 *  - every `.eyebrow` (Michroma labels) decodes in with ScrambleText as it enters;
 *  - every `[data-words]` body text rises word by word out of a blur.
 * Watches the DOM, so lazily mounted sections and new pages are picked up automatically.
 */
export function KineticScan() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {});
    const lite = isLite();
    const scan = () => ctx.add(() => {
      document.querySelectorAll<HTMLElement>("main .eyebrow, footer .eyebrow").forEach((el) => {
        if (done.has(el) || el.closest("[data-no-kinetic]")) return;
        done.add(el);
        // scramble only the plain text nodes, so nested marks (timecodes, emblems) survive
        const nodes = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim());
        const spans = nodes.map((n) => {
          const s = document.createElement("span"); s.textContent = n.textContent; s.setAttribute("aria-hidden", "true");
          n.parentNode!.replaceChild(s, n); return s;
        });
        if (!spans.length) return;
        if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", el.textContent?.trim() ?? "");
        spans.forEach((s) => {
          const final = s.textContent ?? "";
          gsap.fromTo(s, { opacity: 0.2 }, {
            opacity: 1, duration: 1.1, ease: "none",
            scrambleText: { text: final, chars: "XPERIENC█▓▒░01/\\<>", revealDelay: 0.25, speed: 0.7 },
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          });
        });
      });
      document.querySelectorAll<HTMLElement>("[data-words]").forEach((el) => {
        if (done.has(el)) return;
        done.add(el);
        const split = SplitText.create(el, { type: "words", aria: "auto" });
        gsap.from(split.words, {
          yPercent: 60, opacity: 0, filter: lite ? "none" : "blur(10px)", stagger: 0.022, duration: 0.9, ease: "expo",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onComplete: () => gsap.set(split.words, { clearProps: "filter" }),
        });
      });
    });
    scan();
    let t = 0;
    const mo = new MutationObserver(() => { clearTimeout(t); t = window.setTimeout(scan, 120); });
    mo.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); clearTimeout(t); ctx.revert(); };
  }, [pathname]);
  return null;
}
