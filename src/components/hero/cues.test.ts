import { parseCues, withFallbacks, DEFAULT_ZONES } from "./cues";

describe("hero cues", () => {
  it("parses the cue sheet and keeps defaults for missing parts", () => {
    const c = parseCues({ headlineDockAt: 15.5, cards: [{ at: 19, slot: 2 }, { at: 16.2, slot: 1 }], loopCards: [{ at: 2, slot: 1 }], zones: { gallery: { left: 30, right: 70, top: 22, bottom: 60 } } });
    expect(c.headlineDockAt).toBe(15.5);
    expect(c.cards.map((x) => x.at)).toEqual([16.2, 19]);
    expect(c.zones.gallery.left).toBe(30);
    expect(c.zones.galleryMobile).toEqual(DEFAULT_ZONES.galleryMobile);
  });
  it("rejects nonsense safely", () => {
    const c = parseCues({ cards: [{ at: "x" }, null], zones: { gallery: { left: 80, right: 20 } } });
    expect(c.cards).toEqual([]);
    expect(c.zones.gallery).toEqual(DEFAULT_ZONES.gallery);
    expect(parseCues(null).headlineDockAt).toBeNull();
  });
  it("fills sensible timings when no cue sheet exists", () => {
    const c = withFallbacks(parseCues({}), 10, 6, 5);
    expect(c.headlineDockAt).toBe(7);
    expect(c.cards).toHaveLength(3);
    expect(c.loopCards.length).toBeGreaterThan(0);
  });
});
