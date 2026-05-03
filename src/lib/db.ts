import Dexie, { type EntityTable } from "dexie";
import type { Food } from "./schemas";

/**
 * Local Dexie cache. Mirrors carbtrack-au — carb values are never authored
 * locally. Each row carries cached_at so callers can decide on freshness.
 */
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
