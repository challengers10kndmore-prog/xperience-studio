import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { inserted, publish } = vi.hoisted(() => ({ inserted: [] as Record<string, unknown>[], publish: vi.fn(async () => ({ ok: true })) }));
vi.mock("../components/ResourcePage", () => ({
  ResourcePage: () => null,
  useRows: () => ({ data: [{ id: "old", source_url: "https://drive.google.com/file/d/OLDxxxxxxxxxxxxxxxxxxxxxxxxx/view" }] }),
}));
vi.mock("../db", () => ({
  db: () => ({ from: () => ({ insert: (rows: Record<string, unknown>[]) => { inserted.push(...rows); return { select: async () => ({ data: rows.map((_, i) => ({ id: `new${i}` })), error: null }) }; } }) }),
}));
vi.mock("../api", async (orig) => ({
  ...(await orig<typeof import("../api")>()),
  markDispatched: () => {},
  adminApi: {
    publish,
    drive: async () => ({
      items: [
        { id: "AAAxxxxxxxxxxxxxxxxxxxxxxxxx", name: "Brand_Film-final.mp4", folder: "Portfolio", status: "ok" },
        { id: "OLDxxxxxxxxxxxxxxxxxxxxxxxxx", name: "Old one.mp4", folder: "Portfolio", status: "ok" },
        { id: "PRIVxxxxxxxxxxxxxxxxxxxxxxxx", name: "secret.mp4", folder: null, status: "private", note: "Not shared as “Anyone with the link”." },
      ],
      unknown: [],
    }),
  },
}));

import { DriveImport } from "./ProjectsPage";

describe("Drive import", () => {
  it("checks links, skips duplicates and private files, creates pending projects with a Drive inbox entry", async () => {
    render(<QueryClientProvider client={new QueryClient()}><DriveImport /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Google Drive links"), { target: { value: "https://drive.google.com/drive/folders/FOLDERxxxxxxxxxx" } });
    fireEvent.click(screen.getByRole("button", { name: /check links/i }));
    expect(await screen.findByText("Already imported")).toBeInTheDocument();
    expect(screen.getByText(/Not shared as/)).toBeInTheDocument();
    expect((screen.getByLabelText("Import secret.mp4") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Add 1 film(s)" }));
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      title: "Brand Film final", published: true, media_status: "pending",
      source_url: "https://drive.google.com/file/d/AAAxxxxxxxxxxxxxxxxxxxxxxxxx/view",
      inbox: { video_url: { drive: "AAAxxxxxxxxxxxxxxxxxxxxxxxxx", name: "Brand_Film-final.mp4" } },
    });
  });
});
