import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fixtureManifest } from "../src/data/fixtures";

const MEDIA = "https://challengers10kndmore-prog.github.io/xperience-media";
const FIX = path.join(import.meta.dirname, "fixtures");
const SHOTS = process.env.SHOTS ? "docs/hero-film" : "test-results/hero-film";
const t = "2026-11-24T00:00:00.000Z";
const row = (key: string, mobile: boolean) => ({
  key, label: key, prompt: null, desktop_url: `s/${key}-desktop.mp4`, mobile_url: mobile ? `s/${key}-mobile.mp4` : null, poster_url: null,
  overlay_opacity: 0.2, frames: {}, published: true, media_status: "published", media_synced_at: t, created_at: t, updated_at: t,
});
const cues = { headlineDockAt: 3, cards: [{ at: 3.4, slot: 1 }, { at: 4.6, slot: 2 }, { at: 5.8, slot: 3 }, { at: 7.4, slot: 1 }], loopCards: [{ at: 1, slot: 2 }] };

async function setup(page: Page, withFilm = true) {
  const d = structuredClone(fixtureManifest);
  if (withFilm) {
    d.data.section_media = [...d.data.section_media, row("hero-intro", true), row("hero-loop", false)] as typeof d.data.section_media;
    (d.data.site_settings as Record<string, unknown>).hero_cues = cues;
    const p1 = d.data.projects[0];
    d.data.projects = [...d.data.projects, ...["Glass Form", "Night Signal", "Field Notes"].map((title, i) => ({ ...p1, id: `px${i}`, slug: `px-${i}`, title, is_featured: true, sort_order: 10 + i }))];
  }
  await page.addInitScript(() => localStorage.setItem("xp-visited", "1"));
  await page.route(/supabase\.co\//, (r) => r.fulfill({ status: 540, body: "paused" }));
  await page.route(`${MEDIA}/source.json`, (r) => r.fulfill({ json: { data: "manifest" }, headers: { "access-control-allow-origin": "*" } }));
  await page.route(`${MEDIA}/manifest.json`, (r) => r.fulfill({ json: d, headers: { "access-control-allow-origin": "*" } }));
  await page.route(`${MEDIA}/**/*.{mp4,jpg,webp}`, (r) => {
    const m = r.request().url().match(/\/s\/(hero-(?:intro|loop)-(?:desktop|mobile))\.mp4$/);
    if (m) return r.fulfill({ path: path.join(FIX, `${m[1]}.webm`), contentType: "video/webm", headers: { "access-control-allow-origin": "*" } });
    return r.fulfill({ status: 200, body: "", headers: { "access-control-allow-origin": "*" } });
  });
}

const zoneBox = (page: Page) => page.locator("[data-zone=gallery]").boundingBox();

test("hero film: intro → docked headline → cards only inside the gallery zone → loop", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto("/?webgl=0");
  const hero = page.locator("[data-hero=film]");
  await expect(hero).toBeVisible();
  const h1 = hero.locator("h1");
  await page.waitForTimeout(1200);
  // big and centred during the intro
  const textCentre = await h1.evaluate((el) => { let l = Infinity, r = -Infinity; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const rg = document.createRange();
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent?.trim()) continue; rg.selectNodeContents(n); for (const q of Array.from(rg.getClientRects())) { l = Math.min(l, q.left); r = Math.max(r, q.right); } }
    return (l + r) / 2; });
  expect(Math.abs(textCentre - 720)).toBeLessThan(40);
  await page.screenshot({ path: `${SHOTS}/1-intro-centred.jpg`, quality: 70 });
  await expect(hero.getByRole("button", { name: /skip intro/i })).toBeVisible({ timeout: 4000 });
  // after the dock cue the headline sits top-left, cards fly into the gallery zone
  await page.waitForTimeout(5200);
  const docked = (await h1.boundingBox())!;
  expect(docked.x).toBeLessThan(200);
  expect(docked.y).toBeLessThan(260);
  const cards = hero.locator("[data-card]");
  await expect(cards).toHaveCount(3);
  const z = (await zoneBox(page))!;
  for (const c of await cards.all()) {
    const b = (await c.boundingBox())!;
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    expect(cx).toBeGreaterThan(z.x - 4); expect(cx).toBeLessThan(z.x + z.width + 4);
    expect(cy).toBeGreaterThan(z.y - 4); expect(cy).toBeLessThan(z.y + z.height + 4);
  }
  // cards sit above the film
  const zi = await page.locator("[data-zone=gallery]").evaluate((e) => getComputedStyle(e).zIndex);
  expect(Number(zi)).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/2-docked-cards.jpg`, quality: 70 });
  // intro ends → loop takes over (skip disappears)
  await expect(hero.getByRole("button", { name: /skip intro/i })).toHaveCount(0, { timeout: 6000 });
  // clicking a card opens the player
  await cards.first().click({ force: true });
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("hero film: intro plays once per session; skip jumps to the loop", async ({ page }) => {
  await setup(page);
  await page.goto("/?webgl=0");
  const skip = page.getByRole("button", { name: /skip intro/i });
  await expect(skip).toBeVisible({ timeout: 5000 });
  await skip.click();
  await expect(skip).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(800);
  await expect(page.locator("[data-hero=film]")).toBeVisible();
  await expect(skip).toHaveCount(0);
  const h1 = (await page.locator("[data-hero=film] h1").boundingBox())!;
  expect(h1.x).toBeLessThan(200); // docked from the start
});

test("hero film on a phone: vertical intro, cards in the upper middle", async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?webgl=0");
  const v = page.locator("[data-hero=film] video").last();
  await expect(v).toHaveAttribute("src", /hero-intro-mobile\.mp4$/);
  await page.waitForTimeout(6500);
  const z = (await zoneBox(page))!;
  expect(z.y + z.height).toBeLessThan(844 * 0.5);
  await expect(page.locator("[data-hero=film] [data-card]")).toHaveCount(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${SHOTS}/3-phone.jpg`, quality: 70 });
});

test("hero film with reduced motion: still poster, no playback", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await setup(page);
  await page.goto("/?webgl=0");
  await expect(page.locator("[data-hero=film]")).toBeVisible();
  await expect(page.locator("[data-hero=film] video")).toHaveCount(0);
  await expect(page.locator("[data-hero=film] [data-card]")).toHaveCount(2); // reduced motion = lite mode: two cards
  await ctx.close();
});

test("without the film uploaded, the assembly hero stays", async ({ page }) => {
  await setup(page, false);
  await page.goto("/?webgl=0");
  await expect(page.locator("main h1").first()).toContainText("From the manifest.");
  await expect(page.locator("[data-hero=film]")).toHaveCount(0);
});
