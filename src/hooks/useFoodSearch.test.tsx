import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useFoodSearch } from "./useFoodSearch";
import { db } from "@/lib/db";

const ORIGINAL_FETCH = globalThis.fetch;

const SAMPLE = [
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
];

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://example.test");
  vi.stubEnv("VITE_API_TOKEN", "t");
  await db.foods.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("useFoodSearch", () => {
  it("returns empty + source 'empty' when query is blank", async () => {
    const { result } = renderHook(() => useFoodSearch(""), {
      wrapper: wrapper(),
    });
    expect(result.current.results).toEqual([]);
    expect(result.current.source).toBe("empty");
    expect(result.current.isLoading).toBe(false);
  });

  it("hydrates the cache from API and converges to source 'api'", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(SAMPLE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    const { result } = renderHook(() => useFoodSearch("ban"), {
      wrapper: wrapper(),
    });

    await waitFor(() => {
      expect(result.current.results.length).toBe(1);
      expect(result.current.source).toBe("api");
    });
    expect(result.current.results[0]?.name).toBe("Banana, raw");
    expect(await db.foods.count()).toBe(1);
  });

  it("serves cache while API is in flight", async () => {
    await db.foods.put({
      id: 99,
      name: "Banana cached",
      carbs_per_100g: 20,
      icon_key: "fruit_banana",
      active: true,
      cached_at: Date.now(),
    });

    let resolveFetch: ((res: Response) => void) | undefined;
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as typeof fetch;

    const { result } = renderHook(() => useFoodSearch("banana"), {
      wrapper: wrapper(),
    });

    await waitFor(() => {
      expect(result.current.results.length).toBe(1);
      expect(result.current.source).toBe("cache");
    });

    resolveFetch?.(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("surfaces API errors", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("nope", { status: 500, statusText: "Err" }),
    ) as typeof fetch;

    const { result } = renderHook(() => useFoodSearch("x"), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
