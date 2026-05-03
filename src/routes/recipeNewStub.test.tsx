import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { RecipeNewStub } from "./recipeNewStub";
import { renderWithRouter } from "@/test/renderWithRouter";

describe("RecipeNewStub", () => {
  it("shows the seed food id from the search params", async () => {
    renderWithRouter(<RecipeNewStub />, { initialPath: "/recipes/new?seed=42" });
    expect(
      await screen.findByRole("heading", { name: /new recipe/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders without a seed when none is supplied", async () => {
    renderWithRouter(<RecipeNewStub />, { initialPath: "/recipes/new" });
    expect(
      await screen.findByText(/Recipe builder lands in Phase 3/i),
    ).toBeInTheDocument();
  });
});
