import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { FoodIcon } from "@/components/FoodIcon";
import { WeightModal } from "@/components/WeightModal";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFoodSearch } from "@/hooks/useFoodSearch";
import {
  calculateRecipe,
  createRecipe,
  getFood,
  getRecipe,
  updateRecipe,
} from "@/lib/api";
import type {
  CalculateItem,
  Food,
  RecipeDetail,
  RecipeWrite,
} from "@/lib/schemas";

interface IngredientRow {
  food_id: number;
  name: string;
  carbs_per_100g: number;
  quantity_g: number;
  serving_size_g: number | null;
}

interface FormValues {
  name: string;
  servings: number;
  notes: string;
  pinned: boolean;
  ingredients: IngredientRow[];
}

const DEFAULT_QTY_G = 100;

function emptyValues(): FormValues {
  return {
    name: "",
    servings: 1,
    notes: "",
    pinned: false,
    ingredients: [],
  };
}

function detailToValues(d: RecipeDetail): FormValues {
  return {
    name: d.name,
    servings: d.servings,
    notes: d.notes ?? "",
    pinned: d.pinned,
    ingredients: d.ingredients.map((i) => ({
      food_id: i.food_id,
      name: i.name,
      carbs_per_100g: i.carbs_per_100g,
      quantity_g: i.quantity_g,
      serving_size_g: null,
    })),
  };
}

function valuesToWrite(v: FormValues): RecipeWrite {
  return {
    name: v.name.trim(),
    servings: v.servings,
    notes: v.notes.trim() === "" ? null : v.notes,
    pinned: v.pinned,
    ingredients: v.ingredients.map((i, idx) => ({
      food_id: i.food_id,
      quantity_g: i.quantity_g,
      sort_order: idx,
    })),
  };
}

function foodToRow(f: Food, qty: number): IngredientRow {
  return {
    food_id: f.id,
    name: f.name,
    carbs_per_100g: f.carbs_per_100g,
    quantity_g: qty,
    serving_size_g: f.serving_size_g ?? null,
  };
}

function clientCarbTotal(rows: IngredientRow[]): number {
  return rows.reduce(
    (sum, r) => sum + (r.carbs_per_100g * r.quantity_g) / 100,
    0,
  );
}

interface BuilderProps {
  mode: "new" | "edit";
  recipeId?: number;
  seedFoodId?: number;
}

export function RecipeBuilder({ mode, recipeId, seedFoodId }: Readonly<BuilderProps>) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["recipes", "detail", recipeId],
    queryFn: ({ signal }) => getRecipe(recipeId ?? 0, { signal }),
    enabled: mode === "edit" && typeof recipeId === "number",
  });

  const seedQuery = useQuery({
    queryKey: ["foods", "detail", seedFoodId],
    queryFn: ({ signal }) => getFood(seedFoodId ?? 0, { signal }),
    enabled: mode === "new" && typeof seedFoodId === "number",
  });

  const { register, control, handleSubmit, reset, formState } =
    useForm<FormValues>({ defaultValues: emptyValues() });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "ingredients",
  });

  // Both effects guard with a "did this once" ref so background refetches
  // (window focus, manual invalidate after save) don't reset the form and
  // wipe in-progress edits, and so the seed isn't re-appended on remount.
  const detailLoadedRef = useRef(false);
  useEffect(() => {
    if (
      mode === "edit" &&
      detailQuery.data &&
      !detailLoadedRef.current
    ) {
      detailLoadedRef.current = true;
      reset(detailToValues(detailQuery.data));
    }
  }, [mode, detailQuery.data, reset]);

  const seedAppliedRef = useRef(false);
  useEffect(() => {
    if (mode === "new" && seedQuery.data && !seedAppliedRef.current) {
      seedAppliedRef.current = true;
      append(foodToRow(seedQuery.data, DEFAULT_QTY_G));
    }
  }, [mode, seedQuery.data, append]);

  const watchedIngredients = useWatch({ control, name: "ingredients" });
  const ingredients = useMemo(
    () => watchedIngredients ?? [],
    [watchedIngredients],
  );
  const calcItems = useMemo<CalculateItem[]>(
    () =>
      ingredients
        .filter((r) => r.food_id > 0 && r.quantity_g > 0)
        .map((r) => ({ food_id: r.food_id, quantity_g: r.quantity_g })),
    [ingredients],
  );
  const debouncedItems = useDebouncedValue(calcItems, 300);

  const calcQuery = useQuery({
    queryKey: ["recipes", "calculate", debouncedItems],
    queryFn: ({ signal }) => calculateRecipe(debouncedItems, { signal }),
    enabled: debouncedItems.length > 0,
  });

  const totalCarbs = calcQuery.data
    ? calcQuery.data.total_carbs_g
    : clientCarbTotal(ingredients);

  type TotalSource = "api" | "estimated" | "loading" | "empty";
  function resolveTotalSource(): TotalSource {
    if (ingredients.length === 0) return "empty";
    if (calcQuery.isError) return "estimated";
    if (calcQuery.isSuccess) return "api";
    return "loading";
  }
  const totalSource = resolveTotalSource();

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues): Promise<RecipeDetail> => {
      const payload = valuesToWrite(values);
      if (mode === "edit" && typeof recipeId === "number") {
        return updateRecipe(recipeId, payload);
      }
      return createRecipe(payload);
    },
    onSuccess: (data) => {
      setSubmitError(null);
      void queryClient.invalidateQueries({ queryKey: ["recipes"] });
      if (mode === "new") {
        void navigate({
          to: "/recipes/$recipeId",
          params: { recipeId: data.id },
        });
      } else {
        reset(detailToValues(data));
      }
    },
    onError: (err: unknown) => {
      setSubmitError(err instanceof Error ? err.message : "Save failed");
    },
  });

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));
  const isLoading = mode === "edit" && detailQuery.isLoading;

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {mode === "new" ? "New recipe" : "Edit recipe"}
        </h1>
        <Link
          to="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Home
        </Link>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading recipe…</p>
      )}

      {detailQuery.error && (
        <p className="text-sm text-destructive" role="alert">
          Couldn't load recipe: {detailQuery.error.message}
        </p>
      )}

      {seedQuery.error && (
        <p className="text-sm text-destructive" role="alert">
          Couldn't load that ingredient: {seedQuery.error.message}
        </p>
      )}

      {!isLoading && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              {...register("name", { required: true })}
              className="mt-1 w-full rounded-lg border border-border bg-card px-4 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="servings" className="block text-sm font-medium">
                Servings
              </label>
              <input
                id="servings"
                type="number"
                min={1}
                step={1}
                {...register("servings", {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-4 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <Controller
                control={control}
                name="pinned"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-5 w-5"
                  />
                )}
              />
              Pin to top
            </label>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              {...register("notes")}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <section aria-labelledby="ingredients-heading">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="ingredients-heading" className="text-sm font-medium">
                Ingredients
              </h2>
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted/40"
              >
                {pickerOpen ? "Done" : "+ Add ingredient"}
              </button>
            </div>

            {pickerOpen && (
              <IngredientPicker
                existingFoodIds={fields.map((f) => f.food_id)}
                onPick={(food) => {
                  append(foodToRow(food, DEFAULT_QTY_G));
                  setPickerOpen(false);
                }}
              />
            )}

            <ul
              className="mt-2 divide-y divide-border rounded-lg border border-border bg-card"
              data-testid="ingredient-list"
            >
              {fields.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted-foreground">
                  No ingredients yet — tap "+ Add ingredient".
                </li>
              )}
              {fields.map((field, idx) => {
                const row = ingredients[idx] ?? field;
                const carbsForRow =
                  (row.carbs_per_100g * row.quantity_g) / 100;
                return (
                  <li
                    key={field.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <FoodIcon iconKey={null} className="h-8 w-8" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.carbs_per_100g.toFixed(1)} g/100g
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(idx)}
                      className="rounded-lg bg-muted/40 px-3 py-2 text-sm font-medium tabular-nums"
                      aria-label={`Edit weight for ${row.name}`}
                    >
                      {row.quantity_g} g
                    </button>
                    <span className="w-16 text-right text-sm tabular-nums">
                      {carbsForRow.toFixed(1)} g
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      aria-label={`Remove ${row.name}`}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>

            <p
              className="mt-2 text-right text-sm"
              data-testid="carb-total"
            >
              {totalSource === "empty" && (
                <span className="text-muted-foreground">
                  No ingredients
                </span>
              )}
              {totalSource !== "empty" && (
                <>
                  Total:{" "}
                  <strong className="text-base">
                    {totalCarbs.toFixed(1)} g
                  </strong>
                  {totalSource === "estimated" && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (estimated — could not refresh)
                    </span>
                  )}
                  {totalSource === "loading" && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      calculating…
                    </span>
                  )}
                  {totalSource === "api" && calcQuery.isFetching && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      updating…
                    </span>
                  )}
                </>
              )}
            </p>
          </section>

          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={
                saveMutation.isPending ||
                !formState.isValid ||
                fields.length === 0
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving…" : "Save recipe"}
            </button>
          </div>
        </form>
      )}

      {editingIndex !== null && fields[editingIndex] && (
        <WeightModal
          foodName={ingredients[editingIndex]?.name ?? ""}
          servingSizeG={ingredients[editingIndex]?.serving_size_g ?? null}
          initialGrams={ingredients[editingIndex]?.quantity_g ?? DEFAULT_QTY_G}
          onClose={() => setEditingIndex(null)}
          onConfirm={(grams) => {
            const idx = editingIndex;
            const current = ingredients[idx];
            if (current) {
              update(idx, { ...current, quantity_g: grams });
            }
            setEditingIndex(null);
          }}
        />
      )}
    </main>
  );
}

interface IngredientPickerProps {
  existingFoodIds: number[];
  onPick: (food: Food) => void;
}

function IngredientPicker({
  existingFoodIds,
  onPick,
}: Readonly<IngredientPickerProps>) {
  const [query, setQuery] = useState("");
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const debounced = useDebouncedValue(query, 250);
  const { results, isLoading, error } = useFoodSearch(debounced);
  const trimmed = debounced.trim();

  const handlePick = async (foodId: number) => {
    setPickError(null);
    setPickingId(foodId);
    try {
      // Search results don't include serving_size_g — fetch the full food
      // so the WeightModal's "1 serving" preset is available for the picked
      // ingredient just like it is for the seeded one.
      const full = await getFood(foodId);
      onPick(full);
    } catch (err: unknown) {
      setPickError(err instanceof Error ? err.message : "Couldn't add");
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find an ingredient…"
        aria-label="Find an ingredient"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {isLoading && results.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Searching…</p>
      )}
      {!isLoading && error && results.length === 0 && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          Search failed: {error.message}
        </p>
      )}
      {!isLoading &&
        !error &&
        trimmed !== "" &&
        results.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">No matches.</p>
        )}
      {pickError && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {pickError}
        </p>
      )}
      <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto">
        {results.map((row) => {
          const alreadyAdded = existingFoodIds.includes(row.id);
          return (
            <li key={row.id}>
              <button
                type="button"
                disabled={alreadyAdded || pickingId === row.id}
                onClick={() => handlePick(row.id)}
                className="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-muted/40 disabled:opacity-50"
              >
                <FoodIcon iconKey={row.icon_key} className="h-6 w-6" />
                <span className="flex-1 text-sm">{row.name}</span>
                <span className="text-xs text-muted-foreground">
                  {alreadyAdded
                    ? "Added"
                    : `${row.carbs_per_100g.toFixed(1)} g/100g`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

