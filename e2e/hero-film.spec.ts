import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fixtureManifest } from "../src/data/fixtures";

// Plays the hero film against the real cue sheet (docs/hero-film/hero-cues.json) with stand-in films of the same lengths.
const MEDIA = "https://challengers10kndmore-prog.github.io/xperience-media";
const FIX = path.join(import.meta.dirname, "fixtures");
const SHOTS = process.env.SHOTS ? "docs/hero-film" : "test-results/hero-film";
const CUES = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../docs/hero-film/hero-cues.json"), "utf8"));
const RATE = 2; // films run at 2x so the suite stays quick; every cue is read from the video clock, so timing holds
const t = "2026-11-24T00:00:00.000Z";
const row = (key: string, desktop: boolean, mobile: boolean) => ({
  key, label: key, prompt: null, desktop_url: desktop ? `s/${key}-desktop.mp4` : null, mobile_url: mobile ? `s/${key}-mobile.mp4` : null, poster_url: null,
  overlay_opacity: 0.2, frames: {}, published: true, media_status: "published", media_synced_at: t, created_at: t, updated_at: t,
});

async function setup(page: Page, withFilm = true) {
  const d = structuredClone(fixtureManifest);
  if (withFilm) {
    d.data.section_media = [...d.data.section_media, row("hero-intro", true, true), row("hero-loop", true, false), row("hero-idle", false, true)] as typeof d.data.section_media;
    (d.data.site_settings as Record<string, unknown>).hero_cues = CUES;
    (d.data.site_settings as Record<string, unknown>).hero_headline = "Stories, generated and cut by hand.";
    const p1 = d.data.projects[0];
    d.data.projects = [...d.data.projects, ...["Glass Form", "Night Signal", "Field Notes", "Liquid Chrome"].map((title, i) => ({ ...p1, id: `px${i}`, slug: `px-${i}`, title, is_featured: true, sort_order: 10 + i }))];
  }
  await page.addInitScript((rate) => {
    localStorage.setItem("xp-visited", "1");
    // every <video> the hero makes runs at RATE
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { this.defaultPlaybackRate = rate; this.playbackRate = rate; return play.call(this); };
  }, withFilm ? RATE : 1);
  await page.route(/supabase\.co\//, (r) => r.fulfill({ status: 540, body: "paused" }));
  await page.route(`${MEDIA}/source.json`, (r) => r.fulfill({ json: { data: "manifest" }, headers: { "access-control-allow-origin": "*" } }));
  await page.route(`${MEDIA}/manifest.json`, (r) => r.fulfill({ json: d, headers: { "access-control-allow-origin": "*" } }));
  await page.route(`${MEDIA}/**/*.{mp4,jpg,webp}`, (r) => {
    const m = r.request().url().match(/\/s\/(hero-(?:intro|loop|idle)-(?:desktop|mobile))\.mp4$/);
    if (m && fs.existsSync(path.join(FIX, `${m[1]}.webm`))) return r.fulfill({ path: path.join(FIX, `${m[1]}.webm`), contentType: "video/webm", headers: { "access-control-allow-origin": "*" } });
    return r.fulfill({ status: 200, body: "", headers: { "access-control-allow-origin": "*" } });
  });
}

/** Seconds on the currently playing hero film. */
const filmTime = (page: Page) => page.evaluate(() => {
  const s = document.querySelector("[data-hero=film]") as HTMLElement;
  const vids = Array.from(s.querySelectorAll<HTMLVideoElement>(":scope > div video"));
  const v = s.dataset.phase === "intro" ? vids.find((x) => /intro/.test(x.src)) : vids.find((x) => !/intro/.test(x.src));
  return v?.currentTime ?? -1;
});
async function waitFilm(page: Page, phase: "intro" | "loop", at: number) {
  await expect(page.locator(`[data-hero=film][data-phase=${phase}]`)).toHaveCount(1, { timeout: 30_000 });
  await expect.poll(() => filmTime(page), { timeout: 40_000, intervals: [100] }).toBeGreaterThanOrEqual(at);
}
const box = async (page: Page, sel: string) => (await page.locator(sel).first().boundingBox())!;

test.describe.configure({ timeout: 120_000 });

test("desktop: intro headline states, flashes, seamless switch, cut-held cards, intrusions", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto("/?webgl=0");
  const hero = page.locator("[data-hero=film]");
  await expect(hero).toBeVisible();

  // before 4.4 s: no headline yet (he is landing)
  await waitFilm(page, "intro", 2);
  await expect(hero).toHaveAttribute("data-head", "hidden");

  // 4.4 s: large, inside the empty left 35% of the frame
  await waitFilm(page, "intro", 6);
  await expect(hero).toHaveAttribute("data-head", "large-left");
  const big = await box(page, "[data-hero=film] h1");
  expect(big.x).toBeGreaterThanOrEqual(16);
  expect(big.x + big.width).toBeLessThanOrEqual(1440 * 0.36);
  expect(big.height).toBeGreaterThan(120); // large, several lines
  await page.screenshot({ path: `${SHOTS}/1-intro-large-left.jpg`, quality: 70 });
  await expect(hero.getByRole("button", { name: /skip intro/i })).toBeVisible();

  // 8.2 s: clears for the coin flip
  await waitFilm(page, "intro", 9.4);
  await expect(hero).toHaveAttribute("data-head", "fade-out");
  await expect.poll(() => page.locator("[data-hero=film] [data-w]").first().evaluate((e) => Number(getComputedStyle(e).opacity))).toBeLessThan(0.05);

  // 15.3 s: re-enters docked in zones.headline (x .03, y .11, w .37, h .07), one line
  await waitFilm(page, "intro", 15.5);
  await expect(hero).toHaveAttribute("data-head", "docked");
  await page.waitForTimeout(700);
  const dock = await box(page, "[data-hero=film] h1");
  expect(dock.x).toBeLessThan(1440 * 0.06);
  expect(dock.y).toBeGreaterThan(810 * 0.09); expect(dock.y).toBeLessThan(810 * 0.15);
  expect(dock.width).toBeLessThanOrEqual(1440 * 0.38);
  expect(dock.height).toBeLessThan(810 * 0.085); // one line

  // intro ends → loop with no crossfade, intro hidden, docked stays
  await waitFilm(page, "loop", 3);
  await expect(hero.locator("video[src*=hero-intro]")).toHaveClass(/opacity-0/);
  await expect(hero.locator("video[src*=hero-intro]")).not.toHaveClass(/transition-opacity/);
  await expect(hero).toHaveAttribute("data-head", "docked");

  // loop cards 0.8 / 2.6 (slots 1, 2) → by 3 s two cards, each strictly inside the gallery zone
  await waitFilm(page, "loop", 5.4);
  const cards = hero.locator("[data-card]:not([data-leaving])");
  await expect(cards).toHaveCount(3);
  await page.waitForTimeout(900);
  const z = await box(page, "[data-zone=gallery]");
  expect(z.x).toBeCloseTo(1440 * 0.27, -1); expect(z.width).toBeCloseTo(1440 * 0.46, -1);
  for (const c of await cards.all()) {
    const b = (await c.boundingBox())!;
    expect(b.x + b.width / 2).toBeGreaterThan(z.x); expect(b.x + b.width / 2).toBeLessThan(z.x + z.width);
    expect(b.y + b.height / 2).toBeGreaterThan(z.y); expect(b.y + b.height / 2).toBeLessThan(z.y + z.height);
  }
  expect(Number(await page.locator("[data-zone=gallery]").evaluate((e) => getComputedStyle(e).zIndex))).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/2-loop-cards.jpg`, quality: 70 });
  // each cue brought the NEXT featured film: three different titles
  const titles = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  expect(new Set(titles).size).toBe(3);

  // cardRules: the 13.4 s cue is held until 14.483 (0.4 s after the 14.083 cut)
  const lastKey = () => hero.locator("[data-card]").evaluateAll((els) => Math.max(...els.map((e) => Number(e.getAttribute("data-card")))));
  await waitFilm(page, "loop", 12);
  const before = await lastKey();
  await waitFilm(page, "loop", 14.1);
  const during = await lastKey();
  await waitFilm(page, "loop", 14.7);
  const after = await lastKey();
  expect(during).toBe(before); // nothing flies in through the 14.083 sparkle
  expect(after - during).toBe(1);  // the held 13.4 cue lands after the sparkle

  // intrusion 14.9–17.2 (right): cards slide ~6% of the gallery left and shrink 4%
  await waitFilm(page, "loop", 16.2);
  const m = await page.locator("[data-shift]").evaluate((e) => new DOMMatrix(getComputedStyle(e).transform));
  expect(m.m41 / z.width).toBeLessThan(-0.045);
  expect(m.a).toBeLessThan(0.975);
  await page.screenshot({ path: `${SHOTS}/3-intrusion-slide-left.jpg`, quality: 70 });
  await waitFilm(page, "loop", 18.6);
  const m2 = await page.locator("[data-shift]").evaluate((e) => new DOMMatrix(getComputedStyle(e).transform));
  expect(Math.abs(m2.m41)).toBeLessThan(3);

  // clicking a card opens the player
  await page.waitForTimeout(1500);
  const front = hero.locator("[data-card]:not([data-leaving])").filter({ has: page.locator("video, img, span") }).last();
  const fb = (await front.boundingBox())!;
  await page.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("intro plays once per session; skip jumps to the loop", async ({ page }) => {
  await setup(page);
  await page.goto("/?webgl=0");
  const skip = page.getByRole("button", { name: /skip intro/i });
  await expect(skip).toBeVisible({ timeout: 8000 });
  await skip.click();
  await expect(page.locator("[data-hero=film][data-phase=loop]")).toHaveCount(1);
  await expect(page.locator("[data-hero=film]")).toHaveAttribute("data-head", /docked/);
  await page.reload();
  await expect(page.locator("[data-hero=film][data-phase=loop]")).toHaveCount(1);
  await expect(skip).toHaveCount(0);
  await expect(page.locator("[data-hero=film] video[src*=hero-intro]")).toHaveCount(0);
});

test("phone: vertical intro, then the new phone idle loop, one card at a time every 3 s", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?webgl=0");
  const hero = page.locator("[data-hero=film]");
  await expect(hero.locator("video[src*=hero-intro]")).toHaveAttribute("src", /hero-intro-mobile\.mp4$/);
  await expect(hero.locator("video:not([src*=hero-intro])")).toHaveAttribute("src", /hero-idle-mobile\.mp4$/);
  await waitFilm(page, "intro", 6);
  await expect(hero).toHaveAttribute("data-head", "top");
  const top = await box(page, "[data-hero=film] h1");
  expect(top.y).toBeLessThan(844 * 0.3);
  await page.screenshot({ path: `${SHOTS}/4-phone-intro-top.jpg`, quality: 70 });
  await waitFilm(page, "intro", 9);
  await expect(hero).toHaveAttribute("data-head", "fade-out");
  await waitFilm(page, "loop", 1.4);
  await expect(hero).toHaveAttribute("data-head", "docked-top");
  await page.waitForTimeout(800);
  const z = await box(page, "[data-zone=gallery]");
  const h = await box(page, "[data-hero=film] h1");
  expect(h.y + h.height).toBeLessThanOrEqual(z.y + 2); // docked-top sits between the nav and the gallery
  expect(z.y).toBeGreaterThan(844 * 0.1); expect(z.y + z.height).toBeLessThan(844 * 0.47);
  await expect(hero.locator("[data-card]:not([data-leaving])")).toHaveCount(1);
  const first = await hero.locator("[data-card]:not([data-leaving])").getAttribute("data-card");
  // next card 3 s later (and it keeps going across the 6.92 s loop seam)
  await waitFilm(page, "loop", 4.2);
  await page.waitForTimeout(900);
  await expect(hero.locator("[data-card]:not([data-leaving])")).toHaveCount(1);
  expect(await hero.locator("[data-card]:not([data-leaving])").getAttribute("data-card")).not.toBe(first);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${SHOTS}/5-phone-loop.jpg`, quality: 70 });
});

test("reduced motion: still poster, docked headline, static cards", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await setup(page);
  await page.goto("/?webgl=0");
  const hero = page.locator("[data-hero=film]");
  await expect(hero).toBeVisible();
  await expect(hero.locator("video")).toHaveCount(0);
  await expect(hero.locator("[data-card]")).toHaveCount(await page.evaluate(() => (matchMedia("(max-aspect-ratio: 4/5)").matches ? 1 : 3)));
  await expect(hero).toHaveAttribute("data-head", /docked/);
  await ctx.close();
});

test("without the film uploaded, the assembly hero stays", async ({ page }) => {
  await setup(page, false);
  await page.goto("/?webgl=0");
  await expect(page.locator("main h1").first()).toContainText("From the manifest.");
  await expect(page.locator("[data-hero=film]")).toHaveCount(0);
});
