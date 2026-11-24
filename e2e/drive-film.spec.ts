import { test, expect } from "@playwright/test";
import path from "node:path";
import { fixtureManifest } from "../src/data/fixtures";

const MEDIA = "https://challengers10kndmore-prog.github.io/xperience-media";
const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

test("a Google Drive film plays its 10 s preview, then the full film from Drive", async ({ page }) => {
  const d = structuredClone(fixtureManifest);
  d.data.projects = d.data.projects.map((p, i) => (i === 0 ? { ...p, source_url: `https://drive.google.com/file/d/${ID}/view` } : p));
  await page.addInitScript(() => localStorage.setItem("xp-visited", "1"));
  await page.route(/supabase\.co\//, (r) => r.fulfill({ status: 540, body: "paused" }));
  await page.route(/drive\.google\.com\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<html><body style='background:#000;color:#fff'>Drive player</body></html>" }));
  await page.route(`${MEDIA}/source.json`, (r) => r.fulfill({ json: { data: "manifest" }, headers: { "access-control-allow-origin": "*" } }));
  await page.route(`${MEDIA}/manifest.json`, (r) => r.fulfill({ json: d, headers: { "access-control-allow-origin": "*" } }));
  await page.route(`${MEDIA}/**/*.{mp4,jpg,webp}`, (r) => (/\/v\/p1\.mp4$/.test(r.request().url())
    ? r.fulfill({ path: path.join(import.meta.dirname, "fixtures/hero-idle-mobile.webm"), contentType: "video/webm", headers: { "access-control-allow-origin": "*" } })
    : r.fulfill({ status: 200, body: "", headers: { "access-control-allow-origin": "*" } })));

  await page.goto(`/?project=${d.data.projects[0].slug}&webgl=0`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText("10-SECOND PREVIEW")).toBeVisible();
  // when the preview ends, the full-film button takes over the frame
  await dialog.locator("video").evaluate((v: HTMLVideoElement) => { v.currentTime = v.duration || 6.9; v.dispatchEvent(new Event("ended")); });
  const overlayBtn = dialog.locator("video ~ div").getByRole("button", { name: /watch the full film/i });
  await expect(overlayBtn).toBeVisible();
  await overlayBtn.click();
  const frame = dialog.locator("iframe");
  await expect(frame).toHaveAttribute("src", `https://drive.google.com/file/d/${ID}/preview`);
  await expect(frame).toHaveAttribute("allow", /fullscreen/);
  await expect(dialog.locator("video")).toHaveCount(0);
});
