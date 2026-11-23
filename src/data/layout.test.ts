import { orderedSections, visibleSections, DEFAULT_ORDER } from "./layout";

describe("home layout", () => {
  it("uses the default order when nothing is saved", () => expect(orderedSections({})).toEqual(DEFAULT_ORDER));
  it("respects a saved order and keeps sections added later", () => {
    const o = orderedSections({ order: ["contact", "work", "bogus"] });
    expect(o.slice(0, 2)).toEqual(["contact", "work"]);
    expect(o).not.toContain("bogus");
    expect(o).toHaveLength(DEFAULT_ORDER.length);
  });
  it("hides sections", () => expect(visibleSections({ hidden: ["faq", "toolkit"] })).not.toContain("faq"));
});
