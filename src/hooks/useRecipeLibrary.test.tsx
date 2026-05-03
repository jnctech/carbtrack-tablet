import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useRecipeLibrary } from "./useRecipeLibrary";
import { db } from "@/lib/db";

const ORIGINAL_FETCH = globalThis.fetch;

const SAMPLE = [
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
  await db.recipeSummaries.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("useRecipeLibrary", () => {
  it("hydrates from API, pinned-first alpha-sorted", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(SAMPLE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    const { result } = renderHook(() => useRecipeLibrary(), {
      wrapper: wrapper(),
    });

    await waitFor(() => {
      expect(result.current.rows.length).toBe(2);
      expect(result.current.source).toBe("api");
    });
    // pinned first, then alpha
    expect(result.current.rows[0]?.name).toBe("Apple slice");
    expect(result.current.rows[1]?.name).toBe("Pancakes");
    expect(await db.recipeSummaries.count()).toBe(2);
  });

  it("serves cache while API is in flight", async () => {
    await db.recipeSummaries.put({
      id: 99,
      name: "Cached",
      servings: 1,
      pinned: false,
      ingredient_count: 1,
      thumb_url: null,
      cached_at: Date.now(),
    });

    let resolveFetch: ((res: Response) => void) | undefined;
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as typeof fetch;

    const { result } = renderHook(() => useRecipeLibrary(), {
      wrapper: wrapper(),
    });

    await waitFor(() => {
      expect(result.current.rows.length).toBe(1);
      expect(result.current.source).toBe("cache");
    });
    expect(result.current.isLoading).toBe(false);

    resolveFetch?.(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("surfaces API errors when cache is empty", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("nope", { status: 500, statusText: "Err" }),
    ) as typeof fetch;

    const { result } = renderHook(() => useRecipeLibrary(), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.source).toBe("empty");
  });

  it("source 'empty' when API returns [] and cache is empty", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    const { result } = renderHook(() => useRecipeLibrary(), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.source).toBe("empty"));
    expect(result.current.rows.length).toBe(0);
  });
});
