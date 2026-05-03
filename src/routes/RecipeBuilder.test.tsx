import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RecipeBuilder } from "./RecipeBuilder";
import { renderWithRouter } from "@/test/renderWithRouter";
import { db } from "@/lib/db";

const ORIGINAL_FETCH = globalThis.fetch;

const SEED_FOOD = {
  id: 10,
  name: "Carrot",
  brand: null,
  category: "veg",
  carbs_per_100g: 9.6,
  sugars_per_100g: null,
  fibre_per_100g: null,
  gi_rating: null,
  serving_size_g: 80,
  icon_key: "veg_carrot",
  active: true,
};

const RECIPE_DETAIL = {
  id: 5,
  name: "Carrot soup",
  servings: 2,
  notes: "warm",
  pinned: false,
  active: true,
  created_at: "2026-05-03T00:00:00Z",
  updated_at: "2026-05-03T00:00:00Z",
  ingredients: [
    {
      id: 1,
      food_id: 10,
      name: "Carrot",
      carbs_per_100g: 9.6,
      quantity_g: 100,
      carbs_g: 9.6,
      sort_order: 0,
    },
  ],
  attachments: [],
  total_carbs_g: 9.6,
};

const CALC_RESULT_100G = {
  total_carbs_g: 9.6,
  ingredients: [
    { food_id: 10, name: "Carrot", quantity_g: 100, carbs_g: 9.6 },
  ],
};

const CALC_RESULT_150G = {
  total_carbs_g: 14.4,
  ingredients: [
    { food_id: 10, name: "Carrot", quantity_g: 150, carbs_g: 14.4 },
  ],
};

beforeEach(async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://example.test");
  vi.stubEnv("VITE_API_TOKEN", "t");
  await db.foods.clear();
  await db.recipeSummaries.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = ORIGINAL_FETCH;
});

interface Route {
  match: (url: string, init?: RequestInit) => boolean;
  respond: (url: string, init?: RequestInit) => Response | Promise<Response>;
}

function installFetch(routes: Route[]) {
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    for (const route of routes) {
      if (route.match(u, init)) return route.respond(u, init);
    }
    throw new Error(`Unhandled fetch: ${init?.method ?? "GET"} ${u}`);
  }) as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("RecipeBuilder — new mode with seed", () => {
  it("loads the seed food, prefills a row, calculates total, saves", async () => {
    const created = { ...RECIPE_DETAIL, id: 42 };
    const calls: { method: string; url: string; body?: unknown }[] = [];

    installFetch([
      {
        match: (u, init) =>
          (init?.method ?? "GET") === "GET" && u.endsWith("/foods/10"),
        respond: (u, init) => {
          calls.push({ method: init?.method ?? "GET", url: u });
          return jsonResponse(SEED_FOOD);
        },
      },
      {
        match: (u, init) =>
          init?.method === "POST" && u.endsWith("/recipes/calculate"),
        respond: (u, init) => {
          calls.push({
            method: "POST",
            url: u,
            body: JSON.parse((typeof init?.body === "string" ? init.body : "[]")),
          });
          return jsonResponse(CALC_RESULT_100G);
        },
      },
      {
        match: (u, init) =>
          init?.method === "POST" && u.endsWith("/recipes"),
        respond: (u, init) => {
          calls.push({
            method: "POST",
            url: u,
            body: JSON.parse((typeof init?.body === "string" ? init.body : "{}")),
          });
          return jsonResponse(created, 201);
        },
      },
    ]);

    const user = userEvent.setup();
    renderWithRouter(<RecipeBuilder mode="new" seedFoodId={10} />, {
      initialPath: "/recipes/new",
    });

    const list = await screen.findByTestId("ingredient-list");
    await waitFor(() => {
      expect(within(list).getByText("Carrot")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/name/i), "Carrot soup");
    await waitFor(
      () => {
        expect(screen.getByTestId("carb-total")).toHaveTextContent(/9\.6 g/);
      },
      { timeout: 2000 },
    );

    await user.click(screen.getByRole("button", { name: /save recipe/i }));

    await waitFor(() => {
      expect(
        calls.find((c) => c.method === "POST" && c.url.endsWith("/recipes")),
      ).toBeDefined();
    });
    const post = calls.find(
      (c) => c.method === "POST" && c.url.endsWith("/recipes"),
    );
    expect(post?.body).toMatchObject({
      name: "Carrot soup",
      servings: 1,
      pinned: false,
      ingredients: [{ food_id: 10, quantity_g: 100, sort_order: 0 }],
    });
  });

  it("opens WeightModal, lets user edit grams, updates the row + total", async () => {
    installFetch([
      {
        match: (u) => u.endsWith("/foods/10"),
        respond: () => jsonResponse(SEED_FOOD),
      },
      {
        match: (u, init) =>
          init?.method === "POST" && u.endsWith("/recipes/calculate"),
        respond: (_u, init) => {
          const items = JSON.parse((typeof init?.body === "string" ? init.body : "[]")) as {
            food_id: number;
            quantity_g: number;
          }[];
          if (items[0]?.quantity_g === 150) return jsonResponse(CALC_RESULT_150G);
          return jsonResponse(CALC_RESULT_100G);
        },
      },
    ]);

    const user = userEvent.setup();
    renderWithRouter(<RecipeBuilder mode="new" seedFoodId={10} />, {
      initialPath: "/recipes/new",
    });

    await screen.findByText("Carrot");
    await user.click(
      await screen.findByRole("button", { name: /edit weight for carrot/i }),
    );

    const weightInput = await screen.findByLabelText(/weight \(grams\)/i);
    await user.clear(weightInput);
    await user.type(weightInput, "150");
    await user.click(screen.getByRole("button", { name: /^confirm$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("carb-total")).toHaveTextContent(/14\.4 g/);
    });
  });

  it("falls back to client-side estimate when calculate fails", async () => {
    installFetch([
      {
        match: (u) => u.endsWith("/foods/10"),
        respond: () => jsonResponse(SEED_FOOD),
      },
      {
        match: (u, init) =>
          init?.method === "POST" && u.endsWith("/recipes/calculate"),
        respond: () =>
          new Response("boom", { status: 500, statusText: "err" }),
      },
    ]);

    renderWithRouter(<RecipeBuilder mode="new" seedFoodId={10} />, {
      initialPath: "/recipes/new",
    });

    await screen.findByText("Carrot");
    await waitFor(() => {
      expect(screen.getByTestId("carb-total")).toHaveTextContent(/estimated/i);
    });
    expect(screen.getByTestId("carb-total")).toHaveTextContent(/9\.6 g/);
  });

  it("shows 'no ingredients' state when seedFoodId is absent", async () => {
    installFetch([]);
    renderWithRouter(<RecipeBuilder mode="new" />, {
      initialPath: "/recipes/new",
    });
    expect(
      await screen.findByText(/no ingredients yet/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("carb-total")).toHaveTextContent(/no ingredients/i);
  });

  it("removes a row with the × button", async () => {
    installFetch([
      {
        match: (u) => u.endsWith("/foods/10"),
        respond: () => jsonResponse(SEED_FOOD),
      },
      {
        match: (u, init) =>
          init?.method === "POST" && u.endsWith("/recipes/calculate"),
        respond: () => jsonResponse(CALC_RESULT_100G),
      },
    ]);
    const user = userEvent.setup();
    renderWithRouter(<RecipeBuilder mode="new" seedFoodId={10} />, {
      initialPath: "/recipes/new",
    });

    await screen.findByText("Carrot");
    await user.click(screen.getByRole("button", { name: /remove carrot/i }));
    await waitFor(() => {
      expect(screen.queryByText("Carrot")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/no ingredients yet/i)).toBeInTheDocument();
  });
});

describe("RecipeBuilder — ingredient picker", () => {
  const APPLE = {
    id: 11,
    name: "Apple",
    brand: null,
    category: "fruit",
    carbs_per_100g: 13.8,
    sugars_per_100g: null,
    fibre_per_100g: null,
    gi_rating: null,
    serving_size_g: 182,
    icon_key: "fruit_apple",
    active: true,
  };

  it("opens, searches, fetches the full food on pick, and adds the row", async () => {
    const calls: { method: string; url: string }[] = [];
    installFetch([
      {
        match: (u) => u.endsWith("/foods/10"),
        respond: () => jsonResponse(SEED_FOOD),
      },
      {
        match: (u, init) =>
          (init?.method ?? "GET") === "GET" && u.includes("/foods?q="),
        respond: (u) => {
          calls.push({ method: "GET", url: u });
          return jsonResponse([APPLE]);
        },
      },
      {
        match: (u, init) =>
          (init?.method ?? "GET") === "GET" && u.endsWith("/foods/11"),
        respond: (u) => {
          calls.push({ method: "GET", url: u });
          return jsonResponse(APPLE);
        },
      },
      {
        match: (u, init) =>
          init?.method === "POST" && u.endsWith("/recipes/calculate"),
        respond: () => jsonResponse(CALC_RESULT_100G),
      },
    ]);

    const user = userEvent.setup();
    renderWithRouter(<RecipeBuilder mode="new" seedFoodId={10} />, {
      initialPath: "/recipes/new",
    });

    await screen.findByText("Carrot");
    await user.click(screen.getByRole("button", { name: /\+ add ingredient/i }));
    await user.type(
      screen.getByLabelText(/find an ingredient/i),
      "appl",
    );
    const pickButton = await screen.findByRole("button", {
      name: /apple.*g\/100g/i,
    });
    await user.click(pickButton);

    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeInTheDocument();
    });
    expect(
      calls.some((c) => c.url.endsWith("/foods/11")),
    ).toBe(true);
  });

  it("disables already-added rows in the picker", async () => {
    installFetch([
      {
        match: (u) => u.endsWith("/foods/10"),
        respond: () => jsonResponse(SEED_FOOD),
      },
      {
        match: (u, init) =>
          (init?.method ?? "GET") === "GET" && u.includes("/foods?q="),
        respond: () => jsonResponse([SEED_FOOD]),
      },
      {
        match: (u, init) =>
          init?.method === "POST" && u.endsWith("/recipes/calculate"),
        respond: () => jsonResponse(CALC_RESULT_100G),
      },
    ]);

    const user = userEvent.setup();
    renderWithRouter(<RecipeBuilder mode="new" seedFoodId={10} />, {
      initialPath: "/recipes/new",
    });

    await screen.findByText("Carrot");
    await user.click(screen.getByRole("button", { name: /\+ add ingredient/i }));
    await user.type(
      screen.getByLabelText(/find an ingredient/i),
      "carrot",
    );
    const pickButton = await screen.findByRole("button", {
      name: /carrot.*added/i,
    });
    expect(pickButton).toBeDisabled();
  });

  it("shows a seed-load error inline", async () => {
    installFetch([
      {
        match: (u) => u.endsWith("/foods/99"),
        respond: () =>
          new Response("nope", { status: 404, statusText: "not found" }),
      },
    ]);
    renderWithRouter(<RecipeBuilder mode="new" seedFoodId={99} />, {
      initialPath: "/recipes/new",
    });
    await waitFor(() => {
      expect(
        screen.getByText(/couldn't load that ingredient/i),
      ).toBeInTheDocument();
    });
  });
});

describe("RecipeBuilder — edit mode", () => {
  it("loads the recipe, pre-fills the form, and PUTs on save", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];

    installFetch([
      {
        match: (u, init) =>
          (init?.method ?? "GET") === "GET" && u.endsWith("/recipes/5"),
        respond: () => jsonResponse(RECIPE_DETAIL),
      },
      {
        match: (u, init) =>
          init?.method === "POST" && u.endsWith("/recipes/calculate"),
        respond: () => jsonResponse(CALC_RESULT_100G),
      },
      {
        match: (u, init) => init?.method === "PUT" && u.endsWith("/recipes/5"),
        respond: (u, init) => {
          calls.push({
            method: "PUT",
            url: u,
            body: JSON.parse((typeof init?.body === "string" ? init.body : "{}")),
          });
          return jsonResponse({ ...RECIPE_DETAIL, name: "Carrot soup v2" });
        },
      },
    ]);

    const user = userEvent.setup();
    renderWithRouter(<RecipeBuilder mode="edit" recipeId={5} />, {
      initialPath: "/recipes/5",
    });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/name/i) as HTMLInputElement).value,
      ).toBe("Carrot soup");
    });
    expect(screen.getByText("Carrot")).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Carrot soup v2");

    await user.click(screen.getByRole("button", { name: /save recipe/i }));

    await waitFor(() => {
      expect(calls.find((c) => c.method === "PUT")).toBeDefined();
    });
    expect(calls[0]?.body).toMatchObject({
      name: "Carrot soup v2",
      servings: 2,
      ingredients: [{ food_id: 10, quantity_g: 100, sort_order: 0 }],
    });
  });

  it("surfaces a load error", async () => {
    installFetch([
      {
        match: (u) => u.endsWith("/recipes/5"),
        respond: () => new Response("nope", { status: 500, statusText: "err" }),
      },
    ]);
    renderWithRouter(<RecipeBuilder mode="edit" recipeId={5} />, {
      initialPath: "/recipes/5",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load/i);
  });
});
