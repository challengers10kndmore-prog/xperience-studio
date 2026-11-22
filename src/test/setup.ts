import "@testing-library/jest-dom/vitest";

// jsdom gaps
if (!window.matchMedia) {
  window.matchMedia = (q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }) as MediaQueryList;
}
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } root = null; rootMargin = ""; thresholds = []; }
const w = window as unknown as Record<string, unknown>;
w.IntersectionObserver ??= IO;
w.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
HTMLMediaElement.prototype.pause = function () {};
HTMLMediaElement.prototype.load = function () {};
