import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { RecipeLibraryScreen } from "./recipeLibrary";
import { renderWithRouter } from "@/test/renderWithRouter";
import { db } from "@/lib/db";

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://example.test");
  vi.stubEnv("VITE_API_TOKEN", "t");
  await db.recipeSummaries.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = ORIGINAL_FETCH;
});

const FIXTURE = [
  {
    id: 1,
    name: "Pancakes",
    servings: 4,
    pinned: false,
    active: true,
    ingredient_count: 5,
    thumb_url: null,
    updated_at: "2026-05-01T12:00:00Z",
  },
  {
    id: 2,
    name: "Apple slice",
    servings: 1,
    pinned: true,
    active: true,
    ingredient_count: 2,
    thumb_url: "/attachments/2/thumb.webp",
    updated_at: "2026-05-02T08:00:00Z",
  },
];

describe("RecipeLibraryScreen", () => {
  it("shows empty state when no recipes exist", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    renderWithRouter(<RecipeLibraryScreen />, { initialPath: "/recipes" });

    expect(
      await screen.findByText(/no recipes yet — tap "\+ new recipe"/i),
    ).toBeInTheDocument();
  });

  it("renders pinned-first alpha-sorted rows with links to detail", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(FIXTURE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    renderWithRouter(<RecipeLibraryScreen />, { initialPath: "/recipes" });

    const list = await screen.findByTestId("recipe-library-list");
    const items = list.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(items[0]).toHaveTextContent("Apple slice");
    expect(items[1]).toHaveTextContent("Pancakes");

    expect(screen.getByLabelText(/pinned/i)).toBeInTheDocument();

    const appleLink = items[0]?.querySelector("a");
    expect(appleLink).toHaveAttribute("href", "/recipes/2");
  });

  it("links the + New recipe CTA to /recipes/new", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    renderWithRouter(<RecipeLibraryScreen />, { initialPath: "/recipes" });
    const cta = await screen.findByRole("link", { name: /\+ new recipe/i });
    expect(cta).toHaveAttribute("href", "/recipes/new");
  });

  it("falls back to cache and surfaces refresh failure when API errors", async () => {
    await db.recipeSummaries.put({
      id: 99,
      name: "Cached only",
      servings: 1,
      pinned: false,
      ingredient_count: 1,
      thumb_url: null,
      cached_at: Date.now(),
    });

    globalThis.fetch = vi.fn(
      async () => new Response("nope", { status: 500, statusText: "Err" }),
    ) as typeof fetch;

    renderWithRouter(<RecipeLibraryScreen />, { initialPath: "/recipes" });

    await waitFor(() => {
      expect(screen.getByTestId("library-status")).toHaveTextContent(
        /cached — couldn't refresh/i,
      );
    });
    expect(screen.getByText("Cached only")).toBeInTheDocument();
  });

  it("renders an inline error when API fails and cache is empty", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("nope", { status: 500, statusText: "Err" }),
    ) as typeof fetch;

    renderWithRouter(<RecipeLibraryScreen />, { initialPath: "/recipes" });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /couldn't load recipes/i,
      ),
    );
  });
});
