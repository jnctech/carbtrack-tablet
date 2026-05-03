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
      // Best-effort cache write. IDB failures (quota, private mode) shouldn't
      // break search; data is already in TanStack Query state.
      hydrateFoods(apiQuery.data).catch((err: unknown) => {
        console.warn("[useFoodSearch] hydrateFoods failed", err);
      });
    }
  }, [apiQuery.data]);

  if (!enabled) {
    return { results: [], isLoading: false, error: null, source: "empty" };
  }

  return {
    results: cached,
    isLoading: apiQuery.isLoading && cached.length === 0,
    error: apiQuery.error,
    source: pickSource(apiQuery.isSuccess, cached.length),
  };
}

function pickSource(apiSucceeded: boolean, cachedCount: number): FoodSearchSource {
  if (apiSucceeded) return cachedCount > 0 ? "api" : "empty";
  if (cachedCount > 0) return "cache";
  return "empty";
}
