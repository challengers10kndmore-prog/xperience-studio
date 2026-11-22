import { useSyncExternalStore } from "react";

const q = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
const subscribe = (cb: () => void) => { q?.addEventListener?.("change", cb); return () => q?.removeEventListener?.("change", cb); };

export const useReducedMotion = () => useSyncExternalStore(subscribe, () => Boolean(q?.matches), () => false);
export const reducedMotion = () => Boolean(q?.matches);

const fine = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
export const hasFinePointer = () => Boolean(fine?.matches);
