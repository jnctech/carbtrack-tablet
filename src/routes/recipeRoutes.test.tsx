import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { z } from "zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecipeEditScreen, RecipeNewScreen } from "./recipeRoutes";
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

function mountAt(initialPath: string) {
  const root = createRootRoute({ component: () => <Outlet /> });
  const newRoute = createRoute({
    getParentRoute: () => root,
    path: "/recipes/new",
    validateSearch: z.object({ seed: z.number().int().positive().optional() }),
    component: RecipeNewScreen,
  });
  const editRoute = createRoute({
    getParentRoute: () => root,
    path: "/recipes/$recipeId",
    parseParams: (p) => ({ recipeId: Number(p.recipeId) }),
    stringifyParams: (p) => ({ recipeId: String(p.recipeId) }),
    component: RecipeEditScreen,
  });
  const router = createRouter({
    routeTree: root.addChildren([newRoute, editRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("recipe route screens", () => {
  it("RecipeNewScreen renders the builder in new mode", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("no fetch expected for empty new mode");
    }) as typeof fetch;
    mountAt("/recipes/new");
    expect(await screen.findByText(/new recipe/i)).toBeInTheDocument();
  });

  it("RecipeEditScreen passes recipeId from params to the builder", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 7,
          name: "Edit me",
          servings: 1,
          notes: null,
          pinned: false,
          active: true,
          created_at: "2026-05-03T00:00:00Z",
          updated_at: "2026-05-03T00:00:00Z",
          ingredients: [],
          attachments: [],
          total_carbs_g: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    mountAt("/recipes/7");
    await waitFor(() => {
      expect(
        (screen.getByLabelText(/name/i) as HTMLInputElement).value,
      ).toBe("Edit me");
    });
  });
});
