import { Link } from "@tanstack/react-router";
import { useRecipeLibrary, type RecipeLibrarySource } from "@/hooks/useRecipeLibrary";

export function RecipeLibraryScreen() {
  const { rows, isLoading, error, source } = useRecipeLibrary();

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <Link
          to="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Home
        </Link>
      </header>

      <div className="mb-3 flex items-center justify-between gap-2">
        <p
          className="text-xs text-muted-foreground"
          data-testid="library-status"
        >
          {renderStatus({ isLoading, error, source, count: rows.length })}
        </p>
        <Link
          to="/recipes/new"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          + New recipe
        </Link>
      </div>

      {error && rows.length === 0 && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          Couldn't load recipes: {error.message}
        </p>
      )}

      {!isLoading && rows.length === 0 && !error && (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No recipes yet — tap "+ New recipe".
        </p>
      )}

      {rows.length > 0 && (
        <ul
          className="divide-y divide-border rounded-lg border border-border bg-card"
          data-testid="recipe-library-list"
        >
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: row.id }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <RecipeThumb thumbUrl={row.thumb_url} alt={row.name} />
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {row.pinned && (
                      <span aria-label="Pinned" title="Pinned">
                        📌
                      </span>
                    )}
                    <span className="truncate">{row.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.ingredient_count}{" "}
                    {row.ingredient_count === 1 ? "ingredient" : "ingredients"}{" "}
                    · {row.servings} {row.servings === 1 ? "serving" : "servings"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

interface ThumbProps {
  thumbUrl: string | null;
  alt: string;
}

function RecipeThumb({ thumbUrl, alt }: Readonly<ThumbProps>) {
  if (!thumbUrl) {
    return (
      <div
        aria-hidden="true"
        className="h-12 w-12 shrink-0 rounded-md bg-muted/40"
      />
    );
  }
  return (
    <img
      src={thumbUrl}
      alt={alt}
      loading="lazy"
      className="h-12 w-12 shrink-0 rounded-md object-cover"
    />
  );
}

interface StatusArgs {
  isLoading: boolean;
  error: Error | null;
  source: RecipeLibrarySource;
  count: number;
}

function renderStatus({ isLoading, error, source, count }: StatusArgs): string {
  if (isLoading) return "Loading…";
  if (error && count === 0) return "Couldn't load recipes.";
  if (error) return `${count} recipes (cached — couldn't refresh)`;
  if (count === 0) return "No recipes yet.";
  return source === "api" ? `${count} recipes (live)` : `${count} recipes (cached)`;
}
