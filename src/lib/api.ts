import type { ZodType } from "zod";
import {
  CalculateResultSchema,
  FoodSchema,
  FoodSearchResultSchema,
  RecipeDetailSchema,
  RecipeSummaryListSchema,
  type CalculateItem,
  type CalculateResult,
  type Food,
  type RecipeDetail,
  type RecipeSummary,
  type RecipeWrite,
} from "./schemas";

export type ApiErrorKind = "http" | "schema" | "network";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
    public readonly kind: ApiErrorKind = "http",
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
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch (err: unknown) {
    // fetch() rejects with TypeError on DNS/CORS/offline failures. Surface
    // these as a distinct "network" kind so callers can show offline UX
    // instead of treating it as a server error.
    if (err instanceof TypeError) {
      throw new ApiError(
        `Network error: ${err.message}`,
        0,
        err.message,
        "network",
      );
    }
    throw err;
  }
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(
      `${res.status} ${res.statusText}`,
      res.status,
      body,
      "http",
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function parseOrThrow<T>(schema: ZodType<T>, raw: unknown, path: string): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      `Invalid ${path} response shape`,
      0,
      parsed.error.issues,
      "schema",
    );
  }
  return parsed.data;
}

interface SignalOpt {
  signal?: AbortSignal;
}

export interface SearchFoodsOpts extends SignalOpt {
  limit?: number;
}

export async function searchFoods(
  q: string,
  opts: SearchFoodsOpts = {},
): Promise<Food[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(opts.limit ?? 50));
  const path = `/foods?${params.toString()}`;
  const raw = await apiFetch<unknown>(path, { signal: opts.signal });
  return parseOrThrow(FoodSearchResultSchema, raw, "/foods");
}

export async function getFood(id: number, opts: SignalOpt = {}): Promise<Food> {
  const raw = await apiFetch<unknown>(`/foods/${id}`, { signal: opts.signal });
  return parseOrThrow(FoodSchema, raw, `/foods/${id}`);
}

export interface ListRecipesOpts extends SignalOpt {
  includeInactive?: boolean;
}

export async function listRecipes(
  opts: ListRecipesOpts = {},
): Promise<RecipeSummary[]> {
  const params = new URLSearchParams();
  if (opts.includeInactive) params.set("include_inactive", "true");
  const qs = params.toString();
  const path = qs ? `/recipes?${qs}` : "/recipes";
  const raw = await apiFetch<unknown>(path, { signal: opts.signal });
  return parseOrThrow(RecipeSummaryListSchema, raw, "/recipes");
}

export async function getRecipe(
  id: number,
  opts: SignalOpt = {},
): Promise<RecipeDetail> {
  const raw = await apiFetch<unknown>(`/recipes/${id}`, { signal: opts.signal });
  return parseOrThrow(RecipeDetailSchema, raw, `/recipes/${id}`);
}

export async function createRecipe(
  payload: RecipeWrite,
  opts: SignalOpt = {},
): Promise<RecipeDetail> {
  const raw = await apiFetch<unknown>("/recipes", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: opts.signal,
  });
  return parseOrThrow(RecipeDetailSchema, raw, "POST /recipes");
}

export async function updateRecipe(
  id: number,
  payload: RecipeWrite,
  opts: SignalOpt = {},
): Promise<RecipeDetail> {
  const raw = await apiFetch<unknown>(`/recipes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    signal: opts.signal,
  });
  return parseOrThrow(RecipeDetailSchema, raw, `PUT /recipes/${id}`);
}

export async function calculateRecipe(
  items: CalculateItem[],
  opts: SignalOpt = {},
): Promise<CalculateResult> {
  const raw = await apiFetch<unknown>("/recipes/calculate", {
    method: "POST",
    body: JSON.stringify(items),
    signal: opts.signal,
  });
  return parseOrThrow(CalculateResultSchema, raw, "POST /recipes/calculate");
}
