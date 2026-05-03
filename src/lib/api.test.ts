import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";

const ORIGINAL_FETCH = globalThis.fetch;

const VALID_FOOD = {
  id: 1,
  name: "Banana, raw",
  brand: null,
  category: "fruit",
  carbs_per_100g: 22.8,
  sugars_per_100g: 12.2,
  fibre_per_100g: 2.6,
  gi_rating: "low",
  serving_size_g: 118,
  icon_key: "fruit_banana",
  active: true,
};

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "https://example.test");
  vi.stubEnv("VITE_API_TOKEN", "token-123");
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = ORIGINAL_FETCH;
  vi.resetModules();
});

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) =>
    handler(String(url), init),
  ) as typeof fetch;
}

describe("apiFetch", () => {
  it("attaches Authorization + Accept and returns parsed JSON", async () => {
    const { apiFetch } = await import("./api");
    const captured: { url?: string; init?: RequestInit } = {};
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      captured.url = String(url);
      captured.init = init;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const data = await apiFetch<{ ok: boolean }>("/foods/1");

    expect(data).toEqual({ ok: true });
    expect(captured.url).toBe("https://example.test/foods/1");
    const headers = new Headers(captured.init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("throws ApiError on non-2xx responses with status + body", async () => {
    const { apiFetch } = await import("./api");
    globalThis.fetch = vi.fn(
      async () => new Response("nope", { status: 404, statusText: "Not Found" }),
    ) as typeof fetch;

    await expect(apiFetch("/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      body: "nope",
    });
  });

  it("throws if VITE_API_BASE_URL is not configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.resetModules();
    const { apiFetch } = await import("./api");
    await expect(apiFetch("/x")).rejects.toThrow(/VITE_API_BASE_URL/);
  });

  it("ApiError preserves status, body, and defaults kind to 'http'", () => {
    const err = new ApiError("boom", 500, { detail: "x" });
    expect(err.status).toBe(500);
    expect(err.body).toEqual({ detail: "x" });
    expect(err.name).toBe("ApiError");
    expect(err.kind).toBe("http");
  });

  it("wraps fetch TypeError into ApiError(kind='network', status=0)", async () => {
    const { apiFetch } = await import("./api");
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    await expect(apiFetch("/x")).rejects.toMatchObject({
      name: "ApiError",
      kind: "network",
      status: 0,
    });
  });

  it("rethrows non-TypeError fetch failures untouched", async () => {
    const { apiFetch } = await import("./api");
    const boom = new Error("aborted");
    globalThis.fetch = vi.fn(async () => {
      throw boom;
    }) as typeof fetch;
    await expect(apiFetch("/x")).rejects.toBe(boom);
  });

  it("auto-sets Content-Type for body requests", async () => {
    const { apiFetch } = await import("./api");
    let captured: RequestInit | undefined;
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      captured = init;
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    await apiFetch("/x", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(new Headers(captured?.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("returns undefined for 204 responses", async () => {
    const { apiFetch } = await import("./api");
    globalThis.fetch = vi.fn(
      async () => new Response(null, { status: 204 }),
    ) as typeof fetch;
    await expect(apiFetch("/x")).resolves.toBeUndefined();
  });
});

describe("recipe helpers", () => {
  const RECIPE = {
    id: 5,
    name: "Test soup",
    servings: 2,
    notes: null,
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

  it("listRecipes hits /recipes and parses summaries", async () => {
    const { listRecipes } = await import("./api");
    let url = "";
    mockFetch((u) => {
      url = u;
      return new Response(
        JSON.stringify([
          {
            id: 1,
            name: "S",
            servings: 1,
            pinned: false,
            active: true,
            ingredient_count: 0,
            thumb_url: null,
            updated_at: "2026-05-03T00:00:00Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const out = await listRecipes();
    expect(url).toBe("https://example.test/recipes");
    expect(out).toHaveLength(1);
  });

  it("listRecipes adds include_inactive when requested", async () => {
    const { listRecipes } = await import("./api");
    let url = "";
    mockFetch((u) => {
      url = u;
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    await listRecipes({ includeInactive: true });
    expect(url).toBe("https://example.test/recipes?include_inactive=true");
  });

  it("getRecipe parses RecipeDetail", async () => {
    const { getRecipe } = await import("./api");
    mockFetch(
      () =>
        new Response(JSON.stringify(RECIPE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const out = await getRecipe(5);
    expect(out.total_carbs_g).toBe(9.6);
    expect(out.ingredients[0]?.name).toBe("Carrot");
  });

  it("createRecipe POSTs and parses returned detail", async () => {
    const { createRecipe } = await import("./api");
    let captured: { url?: string; init?: RequestInit } = {};
    globalThis.fetch = vi.fn(async (url, init?: RequestInit) => {
      captured = { url: String(url), init };
      return new Response(JSON.stringify(RECIPE), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    const out = await createRecipe({
      name: "Test soup",
      servings: 2,
      notes: null,
      pinned: false,
      ingredients: [{ food_id: 10, quantity_g: 100, sort_order: 0 }],
    });
    expect(captured.url).toBe("https://example.test/recipes");
    expect(captured.init?.method).toBe("POST");
    expect(out.id).toBe(5);
  });

  it("updateRecipe PUTs to /recipes/{id}", async () => {
    const { updateRecipe } = await import("./api");
    let captured: { url?: string; init?: RequestInit } = {};
    globalThis.fetch = vi.fn(async (url, init?: RequestInit) => {
      captured = { url: String(url), init };
      return new Response(JSON.stringify(RECIPE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    await updateRecipe(5, {
      name: "Test soup",
      servings: 2,
      notes: null,
      pinned: true,
      ingredients: [{ food_id: 10, quantity_g: 150, sort_order: 0 }],
    });
    expect(captured.url).toBe("https://example.test/recipes/5");
    expect(captured.init?.method).toBe("PUT");
  });

  it("calculateRecipe POSTs items and returns total", async () => {
    const { calculateRecipe } = await import("./api");
    let body: string | undefined;
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      body = init?.body as string;
      return new Response(
        JSON.stringify({
          total_carbs_g: 19.2,
          ingredients: [
            { food_id: 10, name: "Carrot", quantity_g: 200, carbs_g: 19.2 },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    const out = await calculateRecipe([{ food_id: 10, quantity_g: 200 }]);
    expect(JSON.parse(body ?? "[]")).toEqual([
      { food_id: 10, quantity_g: 200 },
    ]);
    expect(out.total_carbs_g).toBe(19.2);
  });

  it("calculateRecipe throws ApiError(kind='schema') on bad shape", async () => {
    const { calculateRecipe } = await import("./api");
    mockFetch(
      () =>
        new Response(JSON.stringify({ wrong: "shape" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(
      calculateRecipe([{ food_id: 10, quantity_g: 100 }]),
    ).rejects.toMatchObject({
      name: "ApiError",
      kind: "schema",
      status: 0,
    });
  });
});

describe("searchFoods", () => {
  it("hits /foods with q + limit and returns parsed food list", async () => {
    const { searchFoods } = await import("./api");
    let capturedUrl = "";
    mockFetch((url) => {
      capturedUrl = url;
      return new Response(JSON.stringify([VALID_FOOD]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await searchFoods("ban");

    expect(capturedUrl).toBe("https://example.test/foods?q=ban&limit=50");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Banana, raw");
  });

  it("respects the custom limit option", async () => {
    const { searchFoods } = await import("./api");
    let capturedUrl = "";
    mockFetch((url) => {
      capturedUrl = url;
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await searchFoods("x", { limit: 10 });

    expect(capturedUrl).toBe("https://example.test/foods?q=x&limit=10");
  });

  it("omits q when the query is empty", async () => {
    const { searchFoods } = await import("./api");
    let capturedUrl = "";
    mockFetch((url) => {
      capturedUrl = url;
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await searchFoods("");

    expect(capturedUrl).toBe("https://example.test/foods?limit=50");
  });

  it("throws ApiError with status 0 on shape mismatch", async () => {
    const { searchFoods } = await import("./api");
    mockFetch(
      () =>
        new Response(JSON.stringify([{ wrong: "shape" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await expect(searchFoods("x")).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
    });
  });
});

describe("getFood", () => {
  it("fetches /foods/{id} and returns parsed food", async () => {
    const { getFood } = await import("./api");
    let capturedUrl = "";
    mockFetch((url) => {
      capturedUrl = url;
      return new Response(JSON.stringify(VALID_FOOD), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await getFood(1);

    expect(capturedUrl).toBe("https://example.test/foods/1");
    expect(result.id).toBe(1);
  });

  it("throws ApiError on shape mismatch", async () => {
    const { getFood } = await import("./api");
    mockFetch(
      () =>
        new Response(JSON.stringify({ id: "not a number" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await expect(getFood(1)).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
    });
  });
});
