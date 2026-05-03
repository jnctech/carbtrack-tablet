import { FoodIcon } from "./components/FoodIcon";
import { ICON_KEYS } from "./components/foodIconRegistry";

export function App() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">CarbTrack Tablet</h1>
        <p className="text-sm text-muted-foreground">
          Phase 1 scaffold — FoodIcon registry preview
        </p>
      </header>
      <section className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
        {ICON_KEYS.map((key) => (
          <div
            key={key}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3"
          >
            <FoodIcon iconKey={key} className="h-12 w-12" />
            <span className="text-xs text-muted-foreground text-center">{key}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
