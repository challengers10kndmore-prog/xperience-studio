import { mediaUrl, mediaPaths, isPlayableUrl } from "./media";

describe("media host", () => {
  const base = "https://example.github.io/xperience-media";
  it("resolves relative paths against the media host", () => {
    expect(mediaUrl(mediaPaths.video("abc"), base)).toBe(`${base}/v/abc.mp4`);
    expect(mediaUrl("s/hero-desktop.mp4", base + "/")).toBe(`${base}/s/hero-desktop.mp4`);
  });
  it("passes absolute and site-local URLs through", () => {
    expect(mediaUrl("https://cdn.example.com/x.mp4", base)).toBe("https://cdn.example.com/x.mp4");
    expect(mediaUrl("/models/daniel.glb", base)).toBe("/models/daniel.glb");
    expect(mediaUrl(null, base)).toBeUndefined();
  });
  it("never treats release assets as playable", () => {
    expect(isPlayableUrl("https://github.com/o/r/releases/download/v1/master.mp4")).toBe(false);
    expect(isPlayableUrl(`${base}/v/a.mp4`)).toBe(true);
  });
});
