import { liveState } from "./components/StatusBadge";
import { markDispatched } from "./api";

describe("admin publish state", () => {
  it("maps media_status to Pending / Publishing / Live / Failed", () => {
    expect(liveState("projects", "id", { id: "a", media_status: "published" })).toBe("live");
    expect(liveState("projects", "id", { id: "a", media_status: "failed" })).toBe("failed");
    expect(liveState("projects", "id", { id: "b", media_status: "pending" })).toBe("pending");
    markDispatched("projects", "b");
    expect(liveState("projects", "id", { id: "b", media_status: "pending" })).toBe("publishing");
    expect(liveState("faqs", "id", { id: "c" })).toBe("none");
  });
});
