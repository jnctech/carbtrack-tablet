import { Link } from "@tanstack/react-router";

export function App() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">CarbTrack Tablet</h1>
        <p className="text-sm text-muted-foreground">
          Phase 3 — recipe builder
        </p>
      </header>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          to="/search"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-base font-medium hover:bg-muted/40"
        >
          Search ingredients →
        </Link>
        <Link
          to="/recipes/new"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-base font-medium hover:bg-muted/40"
        >
          New recipe →
        </Link>
      </div>
    </main>
  );
}
