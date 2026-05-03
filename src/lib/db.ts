import Dexie, { type EntityTable } from "dexie";
import type { Food, RecipeSummary } from "./schemas";

export interface CachedFood {
  id: number;
  name: string;
  carbs_per_100g: number;
  icon_key: string | null;
  active: boolean;
  cached_at: number;
}

export interface CachedRecipeSummary {
  id: number;
  name: string;
  servings: number;
  pinned: boolean;
  ingredient_count: number;
  thumb_url: string | null;
  cached_at: number;
}

type CarbTrackDB = Dexie & {
  foods: EntityTable<CachedFood, "id">;
  recipeSummaries: EntityTable<CachedRecipeSummary, "id">;
};

export const db = new Dexie("carbtrack-tablet") as CarbTrackDB;

db.version(1).stores({
  foods: "id, name, active, icon_key",
  recipeSummaries: "id, name, pinned",
});

function toCachedFood(food: Food, cachedAt: number): CachedFood {
  return {
    id: food.id,
    name: food.name,
    carbs_per_100g: food.carbs_per_100g,
    icon_key: food.icon_key ?? null,
    active: food.active,
    cached_at: cachedAt,
  };
}

export async function hydrateFoods(foods: Food[]): Promise<void> {
  if (foods.length === 0) return;
  const now = Date.now();
  await db.foods.bulkPut(foods.map((f) => toCachedFood(f, now)));
}

export async function getCachedFoodsByQuery(q: string): Promise<CachedFood[]> {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return [];
  const rows = await db.foods
    .filter(
      (f) => f.active && f.name.toLowerCase().includes(trimmed),
    )
    .toArray();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function toCachedRecipeSummary(
  r: RecipeSummary,
  cachedAt: number,
): CachedRecipeSummary {
  return {
    id: r.id,
    name: r.name,
    servings: r.servings,
    pinned: r.pinned,
    ingredient_count: r.ingredient_count,
    thumb_url: r.thumb_url,
    cached_at: cachedAt,
  };
}

export async function hydrateRecipeSummaries(
  rows: RecipeSummary[],
): Promise<void> {
  if (rows.length === 0) return;
  const now = Date.now();
  await db.recipeSummaries.bulkPut(
    rows.map((r) => toCachedRecipeSummary(r, now)),
  );
}

export async function getCachedRecipeSummaries(): Promise<CachedRecipeSummary[]> {
  const rows = await db.recipeSummaries.toArray();
  return rows.sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name),
  );
}
