import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { searchFoods } from "@/lib/api";
import {
  getCachedFoodsByQuery,
  hydrateFoods,
  type CachedFood,
} from "@/lib/db";

export type FoodSearchSource = "empty" | "cache" | "api";

export interface UseFoodSearchResult {
  results: CachedFood[];
  isLoading: boolean;
  error: Error | null;
  source: FoodSearchSource;
}

/**
 * Cache-first food search. useLiveQuery serves Dexie matches instantly;
 * a TanStack Query in parallel calls the API and hydrates the cache,
 * which re-emits through useLiveQuery — no manual setState dance.
 */
export function useFoodSearch(query: string): UseFoodSearchResult {
  const trimmed = query.trim();
  const enabled = trimmed.length > 0;

  const cached = useLiveQuery(
    () => (enabled ? getCachedFoodsByQuery(trimmed) : Promise.resolve([])),
    [trimmed, enabled],
    [] as CachedFood[],
  );

  const apiQuery = useQuery({
    queryKey: ["foods", "search", trimmed],
    queryFn: ({ signal }) => searchFoods(trimmed, { signal }),
    enabled,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (apiQuery.data && apiQuery.data.length > 0) {
      void hydrateFoods(apiQuery.data);
    }
  }, [apiQuery.data]);

  if (!enabled) {
    return { results: [], isLoading: false, error: null, source: "empty" };
  }

  const source: FoodSearchSource =
    apiQuery.isSuccess && cached.length > 0
      ? "api"
      : cached.length > 0
        ? "cache"
        : "empty";

  return {
    results: cached,
    isLoading: apiQuery.isLoading && cached.length === 0,
    error: (apiQuery.error as Error | null) ?? null,
    source,
  };
}
