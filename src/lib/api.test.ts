import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "https://example.test");
  vi.stubEnv("VITE_API_TOKEN", "token-123");
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = ORIGINAL_FETCH;
  vi.resetModules();
});

describe("apiFetch", () => {
  it("attaches Authorization + Accept and returns parsed JSON", async () => {
    const { apiFetch: freshFetch } = await import("./api");
    const captured: { url?: string; init?: RequestInit } = {};
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      captured.url = String(url);
      captured.init = init;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const data = await freshFetch<{ ok: boolean }>("/foods/1");

    expect(data).toEqual({ ok: true });
    expect(captured.url).toBe("https://example.test/foods/1");
    const headers = new Headers(captured.init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("throws ApiError on non-2xx responses with status + body", async () => {
    const { apiFetch: freshFetch } = await import("./api");
    globalThis.fetch = vi.fn(
      async () => new Response("nope", { status: 404, statusText: "Not Found" }),
    ) as typeof fetch;

    await expect(freshFetch("/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      body: "nope",
    });
  });

  it("throws if VITE_API_BASE_URL is not configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.resetModules();
    const { apiFetch: freshFetch } = await import("./api");
    await expect(freshFetch("/x")).rejects.toThrow(/VITE_API_BASE_URL/);
  });

  it("ApiError preserves status and body", () => {
    const err = new ApiError("boom", 500, { detail: "x" });
    expect(err.status).toBe(500);
    expect(err.body).toEqual({ detail: "x" });
    expect(err.name).toBe("ApiError");
  });
});
