/**
 * "Lite" mode for low-spec machines (set in index.html before first paint: <= 4 GB RAM, <= 2 cores, 4 cores with < 8 GB,
 * data saver, reduced motion, or ?lite=1; ?lite=0 forces full). Lite turns off film grain, animated backgrounds, backdrop blur, WebGL, the long
 * intro and continuous decorative animation, and loads fewer videos at once.
 */
export const isLite = () => typeof document !== "undefined" && document.documentElement.classList.contains("lite");
