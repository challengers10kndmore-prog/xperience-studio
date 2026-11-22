import { loadSiteData, _resetSourceCache, clearFallback, fallbackRemembered } from "./sources";
import { fixtureManifest } from "./fixtures";
import { mediaUrl, isPlayableUrl } from "@/lib/media";

type Handler = (url: string) => Response | Promise<Response> | "hang";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function mockFetch(handler: Handler) {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const r = handler(url);
    if (r === "hang") {
      return new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    }
    return Promise.resolve(r);
  }) as typeof fetch;
}

const isSupabase = (u: string) => u.includes("/rest/v1/");

beforeEach(() => { _resetSourceCache(); clearFallback(); });

describe("DataProvider sources", () => {
  it("falls back to manifest.json when Supabase is paused (540)", async () => {
    const f = mockFetch((u) => (isSupabase(u) ? json({ message: "paused" }, 540) : u.endsWith("source.json") ? json({ data: "auto" }) : json(fixtureManifest)));
    const r = await loadSiteData(f);
    expect(r.origin).toBe("manifest");
    expect(r.fallback).toBe(true);
    expect(r.data.settings.hero_headline).toBe("From the manifest.");
    expect(fallbackRemembered()).toBe(true);
  });

  it("falls back after the 4 s timeout when Supabase hangs", async () => {
    vi.useFakeTimers();
    const f = mockFetch((u) => (isSupabase(u) ? "hang" : u.endsWith("source.json") ? json({ data: "auto" }) : json(fixtureManifest)));
    const p = loadSiteData(f);
    await vi.advanceTimersByTimeAsync(4100);
    const r = await p;
    vi.useRealTimers();
    expect(r.origin).toBe("manifest");
  });

  it("skips Supabase for 5 minutes once fallback is remembered", async () => {
    let calls = 0;
    const f = mockFetch((u) => { if (isSupabase(u)) { calls++; return json({}, 503); } return u.endsWith("source.json") ? json({ data: "auto" }) : json(fixtureManifest); });
    await loadSiteData(f);
    const before = calls;
    await loadSiteData(f);
    expect(calls).toBe(before);
  });

  it("uses manifest only when source.json says github", async () => {
    const f = mockFetch((u) => { if (isSupabase(u)) throw new Error("should not call supabase"); return u.endsWith("source.json") ? json({ data: "github" }) : json(fixtureManifest); });
    const r = await loadSiteData(f);
    expect(r.origin).toBe("manifest");
    expect(r.fallback).toBe(false);
  });

  it("every video in the manifest resolves to a playable media-host URL", async () => {
    const f = mockFetch((u) => (isSupabase(u) ? json({}, 500) : u.endsWith("source.json") ? new Response("", { status: 404 }) : json(fixtureManifest)));
    const r = await loadSiteData(f);
    for (const p of r.data.projects) {
      const v = mediaUrl(p.video_url);
      expect(v).toMatch(/^https:\/\/.+\/v\/.+\.mp4$/);
      expect(isPlayableUrl(v)).toBe(true);
      if (p.full_video_url) expect(isPlayableUrl(p.full_video_url)).toBe(false);
    }
    expect(mediaUrl(r.data.sectionMedia.hero.desktop_url)).toMatch(/\/s\/hero-desktop\.mp4$/);
  });

  it("never errors: bundled defaults when every source is down", async () => {
    const f = mockFetch(() => json({}, 503));
    const r = await loadSiteData(f);
    expect(r.origin).toBe("defaults");
    expect(r.data.settings.hero_headline).toBe("Stories, generated and cut by hand.");
    expect(r.data.services).toHaveLength(4);
  });

  it("honours emergency maintenance from source.json", async () => {
    const f = mockFetch((u) => (u.endsWith("source.json") ? json({ data: "github", maintenance: { enabled: true, message: "Back soon" } }) : json(fixtureManifest)));
    const r = await loadSiteData(f);
    expect(r.maintenance).toEqual({ enabled: true, message: "Back soon" });
  });
});
