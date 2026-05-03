import { Link, useSearch } from "@tanstack/react-router";

/**
 * Phase 3 stub. Receives `?seed={foodId}` from the search screen and shows
 * a placeholder; the recipe builder lands in the next phase.
 */
export function RecipeNewStub() {
  const { seed } = useSearch({ from: "/recipes/new" });
  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-semibold">New recipe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Recipe builder lands in Phase 3.{" "}
        {seed != null && <>Seeded with food id <code>{seed}</code>.</>}
      </p>
      <Link
        to="/search"
        className="mt-4 inline-block text-sm underline underline-offset-4"
      >
        ← Back to search
      </Link>
    </main>
  );
}
