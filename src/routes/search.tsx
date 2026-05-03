import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FoodIcon } from "@/components/FoodIcon";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFoodSearch, type FoodSearchSource } from "@/hooks/useFoodSearch";

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const { results, isLoading, error, source } = useFoodSearch(debounced);

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Search ingredients</h1>
        <Link
          to="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Home
        </Link>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type an ingredient name…"
        aria-label="Search ingredients"
        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
      />

      <p
        className="mt-2 text-xs text-muted-foreground"
        data-testid="search-source"
      >
        {renderStatus({ debounced, isLoading, error, source, count: results.length })}
      </p>

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
        {results.map((row) => (
          <li key={row.id}>
            <Link
              to="/recipes/new"
              search={{ seed: row.id }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
            >
              <FoodIcon iconKey={row.icon_key} className="h-8 w-8" />
              <span className="flex-1 text-sm font-medium">{row.name}</span>
              <span className="text-xs text-muted-foreground">
                {row.carbs_per_100g.toFixed(1)} g/100g
              </span>
            </Link>
          </li>
        ))}
        {results.length === 0 && debounced.trim() !== "" && !isLoading && (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            No matches.
          </li>
        )}
      </ul>
    </main>
  );
}

interface StatusArgs {
  debounced: string;
  isLoading: boolean;
  error: Error | null;
  source: FoodSearchSource;
  count: number;
}

function renderStatus({ debounced, isLoading, error, source, count }: StatusArgs) {
  if (debounced.trim() === "") return "Start typing to search.";
  if (error) return `Error: ${error.message}`;
  if (isLoading) return "Searching…";
  if (count === 0) return "No matches.";
  return source === "api" ? `${count} matches (live)` : `${count} matches (cached)`;
}
