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

  it("ApiError preserves status and body", () => {
    const err = new ApiError("boom", 500, { detail: "x" });
    expect(err.status).toBe(500);
    expect(err.body).toEqual({ detail: "x" });
    expect(err.name).toBe("ApiError");
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
