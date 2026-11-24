import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { VIEWPORTS, PAGES } from "./viewports";

/**
 * Responsive audit: every page at every breakpoint. Fails on horizontal overflow, text running off-screen,
 * and interactive elements narrower/shorter than 44 px on touch screens. Saves a screenshot of each.
 * SHOTS=1 writes them to docs/responsive/ (otherwise test-results/).
 */
const OUT = process.env.SHOTS ? "docs/responsive" : "test-results/responsive";
fs.mkdirSync(OUT, { recursive: true });

async function audit(page: Page, touch: boolean) {
  return page.evaluate((touch) => {
    const vw = document.documentElement.clientWidth;
    const problems: string[] = [];
    const sw = document.documentElement.scrollWidth;
    if (sw > vw + 1) problems.push(`page is ${sw - vw}px wider than the screen`);
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
    // text that runs off-screen (ignores intentionally clipped marquees / carousels / sr-only)
    for (const el of document.querySelectorAll("h1, h2, h3, p, a, button, li, dd, dt, label")) {
      const h = el as HTMLElement;
      if (h.closest("[aria-hidden=true], .sr-only, [data-offscreen-ok], [role=dialog]")) continue;
      const cs = getComputedStyle(h);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const r = h.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.right > vw + 2 || r.left < -2) problems.push(`off-screen: ${label(h)} (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
      if ((/^H[1-3]$/.test(h.tagName)) && h.scrollWidth > h.clientWidth + 2 && cs.overflowX !== "visible") problems.push(`clipped heading: ${label(h)}`);
    }
    if (touch) {
      for (const el of document.querySelectorAll("button, a[href], [role=button], input, select, textarea")) {
        const h = el as HTMLElement;
        if (h.closest("[aria-hidden=true], .sr-only, [data-small-ok], [role=dialog], footer nav")) continue;
        const cs = getComputedStyle(h);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = h.getBoundingClientRect();
        if (!r.width || !r.height || r.bottom < 0) continue;
        if (r.height < 43.5 || r.width < 43.5) problems.push(`tap target ${Math.round(r.width)}x${Math.round(r.height)}: ${label(h)}`);
      }
    }
    return [...new Set(problems)].slice(0, 25);
  }, touch);
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch && vp.width < 1024 });
    for (const path of PAGES) {
      test(`${path}`, async ({ page }) => {
        await page.addInitScript(() => { try { localStorage.setItem("xp-visited", "1"); } catch { /* */ } });
        await page.goto(`${path}${path.includes("?") ? "&" : "?"}webgl=0`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2200);
        // walk the page so lazy sections mount and every scroll-driven state is visited
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < H; y += Math.round(vp.height * 0.9)) {
          await page.evaluate((yy) => { const l = (window as unknown as { __lenis?: { scrollTo(v: number, o: object): void } }).__lenis; if (l) l.scrollTo(yy, { immediate: true }); else window.scrollTo(0, yy); }, y);
          await page.waitForTimeout(60);
        }
        const problems = await audit(page, vp.touch);
        await page.evaluate(() => { const l = (window as unknown as { __lenis?: { scrollTo(v: number, o: object): void } }).__lenis; if (l) l.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); });
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/${vp.name}${path === "/" ? "-home" : path.replace(/\//g, "-")}.jpg`, type: "jpeg", quality: 55 });
        expect(problems, problems.join("\n")).toEqual([]);
      });
    }
  });
}
