import {
  FoodSchema,
  FoodSearchResultSchema,
  type Food,
} from "./schemas";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  const token = import.meta.env.VITE_API_TOKEN ?? "";
  if (!baseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(`${res.status} ${res.statusText}`, res.status, body);
  }
  return res.json() as Promise<T>;
}

export interface SearchFoodsOpts {
  limit?: number;
  signal?: AbortSignal;
}

export async function searchFoods(
  q: string,
  opts: SearchFoodsOpts = {},
): Promise<Food[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(opts.limit ?? 50));
  const raw = await apiFetch<unknown>(`/foods?${params.toString()}`, {
    signal: opts.signal,
  });
  const parsed = FoodSearchResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError("Invalid /foods response shape", 0, parsed.error.issues);
  }
  return parsed.data;
}

export async function getFood(
  id: number,
  opts: { signal?: AbortSignal } = {},
): Promise<Food> {
  const raw = await apiFetch<unknown>(`/foods/${id}`, { signal: opts.signal });
  const parsed = FoodSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      `Invalid /foods/${id} response shape`,
      0,
      parsed.error.issues,
    );
  }
  return parsed.data;
}
