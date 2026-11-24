import { test, expect } from "@playwright/test";
import { fixtureManifest } from "../src/data/fixtures";

const MEDIA = "https://challengers10kndmore-prog.github.io/xperience-media";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("xp-visited", "1"));
  // Supabase is down (paused project answers 540)
  await page.route(/supabase\.co\//, (r) => r.fulfill({ status: 540, body: "paused" }));
  await page.route(`${MEDIA}/source.json`, (r) => r.fulfill({ json: { data: "auto" }, headers: { "access-control-allow-origin": "*" } }));
  await page.route(`${MEDIA}/manifest.json`, (r) => r.fulfill({ json: fixtureManifest, headers: { "access-control-allow-origin": "*" } }));
  await page.route(`${MEDIA}/**/*.{mp4,jpg}`, (r) => r.fulfill({ status: 200, body: "", headers: { "access-control-allow-origin": "*" } }));
});

test("with Supabase blocked the whole site renders from manifest.json", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/?webgl=0");
  await expect(page.locator("main h1").first()).toContainText("From the manifest.");
  await page.locator("#library").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /Neon Genesis Spot/ }).first()).toBeVisible();
  for (const id of ["manifesto", "work", "crafts", "library", "process", "toolkit", "proof", "services", "faq", "contact"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test("every video resolves to the media host and release assets never reach <video>", async ({ page }) => {
  await page.goto("/?webgl=0");
  await expect(page.locator("main h1").first()).toContainText("From the manifest.");
  await page.locator("#library").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const srcs = await page.$$eval("video[src]", (vs) => vs.map((v) => (v as HTMLVideoElement).src));
  expect(srcs.length).toBeGreaterThan(0);
  for (const s of srcs) {
    expect(s.startsWith(MEDIA)).toBe(true);
    expect(s).not.toContain("/releases/download/");
  }
});

test("keyboard: skip link and player close with Escape", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop keyboard check");
  await page.goto("/?webgl=0");
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.waitForTimeout(1200);
  await page.keyboard.press("Tab");
  await expect(page.getByText("Skip to content")).toBeFocused();
  await page.locator("#library").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Fast-forward to the next film" }).click();
  await page.getByRole("button", { name: "Play Creator Cut with sound" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Creator Cut" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
