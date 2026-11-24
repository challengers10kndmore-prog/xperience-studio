import fs from "node:fs";
import path from "node:path";
import { parseCues, withFallbacks, holdForCuts, headAt, intrusionAt, DEFAULT_ZONES } from "./cues";

const sheet = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../docs/hero-film/hero-cues.json"), "utf8"));

describe("hero cue sheet (docs/hero-film/hero-cues.json)", () => {
  const c = parseCues(sheet);
  it("reads zones, headline states, cuts and cards", () => {
    expect(c.authored).toBe(true);
    expect(c.zones.gallery).toEqual({ x: 0.27, y: 0.2, w: 0.46, h: 0.42 });
    expect(c.zones.headline.w).toBe(0.37);
    expect(c.intro.headline.map((h) => h.state)).toEqual(["large-left", "fade-out", "docked"]);
    expect(c.intro.flashes.map((f) => f.type)).toEqual(["impact", "burst"]);
    expect(c.loop.cuts).toHaveLength(5);
    expect(c.loop.cards).toHaveLength(15);
    expect(c.loop.holdAfterCut).toBe(0.4);
    expect(c.durations).toEqual({ intro: 15.833, loop: 37.083 });
  });
  it("turns the intrusion notes into slide/shrink amounts", () => {
    expect(c.loop.intrusions.map((i) => [i.shift, i.scale])).toEqual([[-0.06, 0.96], [0.05, 1], [-0.05, 1]]);
    expect(intrusionAt(c.loop.intrusions, 16).shift).toBeCloseTo(-0.06);
    expect(intrusionAt(c.loop.intrusions, 10)).toEqual({ shift: 0, scale: 1 });
    const mid = intrusionAt(c.loop.intrusions, 14.9 - 0.225).shift;
    expect(mid).toBeLessThan(0); expect(mid).toBeGreaterThan(-0.06);
  });
  it("reads the mobile notes", () => {
    expect(c.mobile.gallery).toEqual({ x: 0.06, y: 0.14, w: 0.88, h: 0.3 });
    expect(c.mobile.cardEvery).toBe(3);
    expect(c.mobile.cardStart).toBe(0.8);
    expect(c.mobile.headline.map((h) => h.state)).toEqual(["top", "fade-out", "docked-top"]);
  });
  it("holds arrivals until 0.4 s after a cut", () => {
    const held = holdForCuts(c.loop.cards, c.loop.cuts, c.loop.holdAfterCut);
    const ats = held.map((h) => h.at);
    expect(ats).toContain(14.483); // 13.4 would land inside the 14.083 sparkle
    expect(ats).toContain(21.9);   // 21.2 → after the 21.5 cut
    expect(ats).toContain(29.317); // 28.4 → after the 28.917 cut
    expect(ats).toContain(7.4);    // already clear of the 6.667 cut
    expect(held).toHaveLength(15);
  });
  it("headline state at any time", () => {
    expect(headAt(c.intro.headline, 1, "hidden")).toBe("hidden");
    expect(headAt(c.intro.headline, 5, "hidden")).toBe("large-left");
    expect(headAt(c.intro.headline, 9, "hidden")).toBe("fade-out");
    expect(headAt(c.intro.headline, 15.4, "hidden")).toBe("docked");
  });
});

describe("hero cues: old shape + nonsense", () => {
  it("still accepts the first, simpler shape", () => {
    const c = parseCues({ headlineDockAt: 15.5, cards: [{ at: 19, slot: 2 }, { at: 16.2, slot: 1 }], loopCards: [{ at: 2, slot: 1 }], zones: { gallery: { left: 30, right: 70, top: 22, bottom: 60 } } });
    expect(c.intro.headline.at(-1)).toEqual({ at: 15.5, state: "docked" });
    expect(c.intro.cards.map((x) => x.at)).toEqual([16.2, 19]);
    expect(c.zones.gallery.x).toBeCloseTo(0.3);
  });
  it("rejects nonsense safely and fills timings", () => {
    const c = parseCues({ loop: { cards: [{ at: "x" }, null] }, zones: { gallery: { x: 0.9, w: 0.5 } } });
    expect(c.loop.cards).toEqual([]);
    expect(c.zones.gallery).toEqual(DEFAULT_ZONES.gallery);
    expect(parseCues(null).authored).toBe(false);
    const f = withFallbacks(parseCues({}), 10, 9);
    expect(f.intro.headline.at(-1)?.state).toBe("docked");
    expect(f.loop.cards.length).toBeGreaterThan(1);
    expect(f.mobile.headline.at(-1)?.state).toBe("docked-top");
  });
});
