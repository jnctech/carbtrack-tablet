import Dexie, { type EntityTable } from "dexie";

/**
 * Local Dexie cache. Phase 1 declares the schema only; Phase 2 wires the
 * hydration logic from the carbtrack-au API. Carb values are never authored
 * locally — the cache mirrors the API and is invalidated on hydration.
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
