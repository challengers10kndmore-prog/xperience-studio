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

// @ts-expect-error plain .mjs module without types
import { previewWindow, driveIdOf, driveDownloadUrl, PREVIEW_S, aspectOf } from "./lib.mjs";
describe("Google Drive films", () => {
  it("plans a 10 s preview with no master upload", () => {
    const jobs = planJobs("projects", { id: "abc", inbox: { video_url: { drive: "1AbCdEfGhIjKlMnOpQrSt", name: "Ad.mp4" } } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ field: "video_url", out: "v/abc.mp4", teaser: "t/abc.mp4", poster: "p/abc.jpg", master: false, preview: 10 });
    expect(PREVIEW_S).toBe(10);
    expect(driveIdOf({ drive: "bad id!" })).toBeNull();
    expect(driveDownloadUrl("1AbC")).toContain("confirm=t");
  });
  it("detects the format", () => {
    expect([aspectOf(1920, 1080), aspectOf(1080, 1920), aspectOf(1080, 1080), aspectOf(1080, 1350), aspectOf(2560, 1080), aspectOf(1440, 1080)]).toEqual(["16:9", "9:16", "1:1", "4:5", "21:9", "16:9"]);
  });
  it("picks the preview window around the best frame, inside the film", () => {
    expect(previewWindow(120, 60)).toEqual({ start: 57, length: 10 });
    expect(previewWindow(120, 1)).toEqual({ start: 0, length: 10 });
    expect(previewWindow(120, 119)).toEqual({ start: 110, length: 10 });
    expect(previewWindow(8, 4)).toEqual({ start: 0, length: 8 });
  });
  it("cuts with -ss before the input and -t after; teasers stay at 6 s", () => {
    const a = ffmpegArgs({ input: "i", output: "o", audio: true, start: 57, length: 10 });
    expect(a.join(" ")).toContain("-ss 57 -i i -t 10");
    const t = ffmpegArgs({ input: "i", output: "o", teaser: true, start: 57, length: 10 });
    expect(t.join(" ")).toContain("-ss 57 -i i -t 6");
    expect(ffmpegArgs({ input: "i", output: "o", teaser: true }).join(" ")).toContain("-i i -t 6");
  });
});
