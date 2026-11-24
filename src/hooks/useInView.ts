import { useEffect, useState, type RefObject } from "react";

/** Tracks whether an element is within (rootMargin of) the viewport. */
export function useInView(ref: RefObject<Element | null>, rootMargin = "200px", once = false) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (e.isIntersecting && once) io.disconnect();
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}

export function useMediaQuery(q: string) {
  const get = () => typeof window !== "undefined" && !!window.matchMedia?.(q).matches;
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

/** Phones in either orientation: narrow, or short landscape. Pinned sideways sections use their phone layout here. */
export const COMPACT_QUERY = "(max-width: 767px), (max-height: 520px)";
export const useCompact = () => useMediaQuery(COMPACT_QUERY);

/** Touch stand-in for hover: true while the element is mostly on screen, on devices without hover. */
export function useTouchActive(ref: RefObject<Element | null>) {
  const touch = useMediaQuery("(hover: none)");
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!touch || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOn(e.intersectionRatio >= 0.7), { threshold: [0, 0.7, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, touch]);
  return touch && on;
}
