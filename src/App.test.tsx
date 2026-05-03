import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { renderWithRouter } from "./test/renderWithRouter";

describe("App", () => {
  it("renders the heading and a link to /search", async () => {
    renderWithRouter(<App />);
    expect(
      await screen.findByRole("heading", { name: /carbtrack tablet/i }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /search ingredients/i });
    expect(link).toHaveAttribute("href", "/search");
  });

  it("links to the recipe library", async () => {
    renderWithRouter(<App />);
    const link = await screen.findByRole("link", { name: /my recipes/i });
    expect(link).toHaveAttribute("href", "/recipes");
  });
});
