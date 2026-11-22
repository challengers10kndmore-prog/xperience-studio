import { formatDuration, slugify, timecode, formatBytes } from "./utils";

describe("utils", () => {
  it("formats durations", () => {
    expect(formatDuration(83.4)).toBe("01:23");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(null)).toBe("--:--");
  });
  it("makes timecodes", () => expect(timecode(61.5, 24)).toBe("00:01:01:12"));
  it("slugifies", () => expect(slugify("Xpers Streaming — Launch!")).toBe("xpers-streaming-launch"));
  it("formats bytes", () => expect(formatBytes(1536)).toBe("1.5 KB"));
});
