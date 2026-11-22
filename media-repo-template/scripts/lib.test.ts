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
