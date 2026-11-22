import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkGrid } from "./WorkGrid";
import { placeholderProjects } from "@/data/placeholders";
import { PlayerProvider } from "@/components/media/Player";

describe("WorkGrid", () => {
  it("renders every project and filter chips", () => {
    render(
      <QueryClientProvider client={new QueryClient()}><MemoryRouter><PlayerProvider>
        <WorkGrid projects={placeholderProjects} />
      </PlayerProvider></MemoryRouter></QueryClientProvider>,
    );
    expect(screen.getAllByRole("button", { name: /Play/ })).toHaveLength(placeholderProjects.length);
    expect(screen.getByRole("button", { name: "Xperience Originals" })).toBeInTheDocument();
    expect(screen.getAllByText("Placeholder").length).toBeGreaterThan(0);
  });
  it("locks to a discipline on category pages", () => {
    render(<MemoryRouter><PlayerProvider><WorkGrid projects={placeholderProjects} lockDiscipline="editing" /></PlayerProvider></MemoryRouter>);
    expect(screen.getAllByRole("button", { name: /Play/ })).toHaveLength(placeholderProjects.filter((p) => p.discipline === "editing").length);
  });
});
