import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SearchScreen } from "./search";
import { renderWithRouter } from "@/test/renderWithRouter";
import { db } from "@/lib/db";

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://example.test");
  vi.stubEnv("VITE_API_TOKEN", "t");
  await db.foods.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("SearchScreen", () => {
  it("starts empty and prompts to type", async () => {
    renderWithRouter(<SearchScreen />, { initialPath: "/search" });
    expect(await screen.findByTestId("search-source")).toHaveTextContent(
      /start typing/i,
    );
  });

  it("debounces input and renders API results", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              id: 1,
              name: "Banana, raw",
              brand: null,
              category: "fruit",
              carbs_per_100g: 22.8,
              sugars_per_100g: null,
              fibre_per_100g: null,
              gi_rating: null,
              serving_size_g: null,
              icon_key: "fruit_banana",
              active: true,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ) as typeof fetch;

    const user = userEvent.setup();
    renderWithRouter(<SearchScreen />, { initialPath: "/search" });

    const input = await screen.findByRole("searchbox", {
      name: /search ingredients/i,
    });
    await user.type(input, "ban");

    await waitFor(
      () => {
        expect(screen.getByText("Banana, raw")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    expect(screen.getByTestId("search-source")).toHaveTextContent(/live/i);
  });

  it("shows 'no matches' when API returns empty for a query", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    const user = userEvent.setup();
    renderWithRouter(<SearchScreen />, { initialPath: "/search" });
    const input = await screen.findByRole("searchbox", {
      name: /search ingredients/i,
    });
    await user.type(input, "zzz");

    await waitFor(() =>
      expect(screen.getByTestId("search-source")).toHaveTextContent(
        /no matches/i,
      ),
    );
  });
});
