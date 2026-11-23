// @ts-expect-error plain .mjs module without types
import { planJobs, ffmpegArgs, bitrateFor, buildManifest, MAX_BYTES } from "./lib.mjs";

describe("media sync planning", () => {
  it("maps a project upload to video, teaser and poster paths", () => {
    const jobs = planJobs("projects", { id: "abc", inbox_path: "projects/abc/raw.mov", inbox: {} });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ field: "video_url", out: "v/abc.mp4", teaser: "t/abc.mp4", poster: "p/abc.jpg", master: true });
  });
  it("maps section loops by key", () => {
    const jobs = planJobs("section_media", { key: "hero", inbox: { desktop_url: "s/hero-d.mp4", mobile_url: "s/hero-m.mp4" } });
    expect(jobs.map((j: { out: string }) => j.out)).toEqual(["s/hero-desktop.mp4", "s/hero-mobile.mp4"]);
  });
  it("loops and teasers have no audio; films keep AAC 128k with faststart", () => {
    const loop = ffmpegArgs({ input: "i", output: "o", audio: true, loop: true });
    expect(loop).toContain("-an");
    const film = ffmpegArgs({ input: "i", output: "o", audio: true });
    expect(film.join(" ")).toContain("-c:a aac -b:a 128k");
    expect(film.join(" ")).toContain("-movflags +faststart");
    expect(film.join(" ")).toContain("-crf 23");
    expect(film.join(" ")).toContain("-preset veryfast");
    expect(film.join(" ")).toContain("-profile:v high");
  });
  it("lowers bitrate to fit under 95 MB", () => {
    const kbps = bitrateFor(600, true);
    const bytes = ((kbps + 128) * 1000 * 600) / 8;
    expect(bytes).toBeLessThan(MAX_BYTES);
  });
  it("keeps maintenance state when rebuilding the manifest", () => {
    const m = buildManifest({ projects: [] }, { maintenance: { enabled: true, message: "x" } });
    expect(m.maintenance.enabled).toBe(true);
    expect(m.version).toBe(1);
  });
});

// @ts-expect-error plain .mjs module without types
import { frameArgs } from "./lib.mjs";
describe("hero frame sequence", () => {
  it("marks hero-assembly uploads for frame extraction with an end-frame poster", () => {
    const jobs = planJobs("section_media", { key: "hero-assembly", inbox: { desktop_url: "a.mp4", mobile_url: "b.mp4" } });
    expect(jobs[0]).toMatchObject({ posterAtEnd: true, frames: { variant: "desktop", dir: "s/hero-assembly-desktop", w: 1280, h: 720 } });
    expect(jobs[1].frames).toMatchObject({ variant: "mobile", w: 540, h: 960 });
    expect(planJobs("section_media", { key: "hero-idle", inbox: { desktop_url: "a.mp4" } })[0].frames).toBeUndefined();
  });
  it("cuts about 96 frames from 8 s", () => {
    const a = frameArgs("in.mp4", "out", { w: 1280, h: 720 }, 8).join(" ");
    expect(a).toContain("fps=12.0000");
    expect(a).toContain("libwebp");
    expect(a).toContain("out/f%03d.webp");
  });
});

// @ts-expect-error plain .mjs module without types
import { cleanTitle, draftCaption } from "./posters.mjs";
describe("chunked uploads + captions", () => {
  it("plans a job for a file uploaded in parts, and skips instruction keys", () => {
    const jobs = planJobs("projects", { id: "x", inbox: { video_url: { parts: ["a.part001", "a.part002"], size: 9 }, _poster: { auto: true }, _cover: true } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].src).toEqual({ parts: ["a.part001", "a.part002"], size: 9 });
  });
  it("cleans export-style titles and drafts a one-line caption", () => {
    expect(cleanTitle("Arabic coffee service brand 202607101846")).toBe("Arabic coffee service brand");
    expect(draftCaption("Net me", "")).toBe("Net me");
    const c = draftCaption("X", "A very long brief that goes on and on about the project and what it did for the client and the launch and more words here.");
    expect(c.length).toBeLessThanOrEqual(90);
  });
});
