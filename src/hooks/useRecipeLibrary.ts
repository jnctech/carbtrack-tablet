import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { listRecipes } from "@/lib/api";
import {
  getCachedRecipeSummaries,
  hydrateRecipeSummaries,
  type CachedRecipeSummary,
} from "@/lib/db";

export type RecipeLibrarySource = "empty" | "cache" | "api";

export interface UseRecipeLibraryResult {
  rows: CachedRecipeSummary[];
  isLoading: boolean;
  error: Error | null;
  source: RecipeLibrarySource;
}

export function useRecipeLibrary(): UseRecipeLibraryResult {
  const cached = useLiveQuery(
    () => getCachedRecipeSummaries(),
    [],
    [] as CachedRecipeSummary[],
  );

  const apiQuery = useQuery({
    queryKey: ["recipes", "list"],
    queryFn: ({ signal }) => listRecipes({ signal }),
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (apiQuery.data && apiQuery.data.length > 0) {
      hydrateRecipeSummaries(apiQuery.data).catch((err: unknown) => {
        console.warn("[useRecipeLibrary] hydrateRecipeSummaries failed", err);
      });
    }
  }, [apiQuery.data]);

  return {
    rows: cached,
    isLoading: apiQuery.isLoading && cached.length === 0,
    error: apiQuery.error,
    source: pickSource(apiQuery.isSuccess, cached.length),
  };
}

function pickSource(
  apiSucceeded: boolean,
  cachedCount: number,
): RecipeLibrarySource {
  if (apiSucceeded) return cachedCount > 0 ? "api" : "empty";
  if (cachedCount > 0) return "cache";
  return "empty";
}
