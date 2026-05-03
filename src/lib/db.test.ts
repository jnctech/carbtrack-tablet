import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  db,
  getCachedFoodsByQuery,
  hydrateFoods,
  type CachedFood,
  type CachedRecipeSummary,
} from "./db";
import type { Food } from "./schemas";

afterEach(async () => {
  await db.foods.clear();
  await db.recipeSummaries.clear();
});

describe("db", () => {
  it("declares the expected tables", () => {
    expect(
      db.tables.map((t) => t.name).sort((a, b) => a.localeCompare(b)),
    ).toEqual([
      "foods",
      "recipeSummaries",
    ]);
  });

  it("round-trips a CachedFood row", async () => {
    const row: CachedFood = {
      id: 1,
      name: "Banana, raw",
      carbs_per_100g: 22.8,
      icon_key: "fruit_banana",
      active: true,
      cached_at: Date.now(),
    };
    await db.foods.put(row);
    expect(await db.foods.get(1)).toEqual(row);
  });

  it("round-trips a CachedRecipeSummary row", async () => {
    const row: CachedRecipeSummary = {
      id: 7,
      name: "Test",
      servings: 2,
      pinned: false,
      ingredient_count: 3,
      thumb_url: null,
      cached_at: Date.now(),
    };
    await db.recipeSummaries.put(row);
    expect(await db.recipeSummaries.get(7)).toEqual(row);
  });
});

const food = (overrides: Partial<Food> & Pick<Food, "id" | "name">): Food => ({
  carbs_per_100g: 10,
  active: true,
  icon_key: null,
  brand: null,
  category: null,
  sugars_per_100g: null,
  fibre_per_100g: null,
  gi_rating: null,
  serving_size_g: null,
  ...overrides,
});

describe("hydrateFoods", () => {
  it("bulk-puts foods with cached_at stamped", async () => {
    const before = Date.now();
    await hydrateFoods([
      food({ id: 10, name: "Apple", carbs_per_100g: 12 }),
      food({ id: 11, name: "Banana", carbs_per_100g: 22, icon_key: "fruit_banana" }),
    ]);
    const rows = await db.foods.toArray();
    expect(rows).toHaveLength(2);
    const apple = rows.find((r) => r.id === 10);
    expect(apple?.name).toBe("Apple");
    expect(apple?.cached_at).toBeGreaterThanOrEqual(before);
  });

  it("is a no-op for an empty list", async () => {
    await hydrateFoods([]);
    expect(await db.foods.count()).toBe(0);
  });

  it("overwrites existing rows on re-hydrate", async () => {
    await hydrateFoods([food({ id: 1, name: "Old", carbs_per_100g: 5 })]);
    await hydrateFoods([food({ id: 1, name: "New", carbs_per_100g: 6 })]);
    const row = await db.foods.get(1);
    expect(row?.name).toBe("New");
    expect(row?.carbs_per_100g).toBe(6);
  });
});

describe("getCachedFoodsByQuery", () => {
  it("returns empty for blank queries", async () => {
    expect(await getCachedFoodsByQuery("")).toEqual([]);
    expect(await getCachedFoodsByQuery("   ")).toEqual([]);
  });

  it("filters case-insensitively, excludes inactive, sorts alpha", async () => {
    await hydrateFoods([
      food({ id: 1, name: "Banana, raw" }),
      food({ id: 2, name: "Banana bread" }),
      food({ id: 3, name: "Apple" }),
      food({ id: 4, name: "Old banana", active: false }),
    ]);
    const out = await getCachedFoodsByQuery("BANANA");
    expect(out.map((r) => r.id)).toEqual([2, 1]);
  });

  it("returns empty when cache is cold", async () => {
    expect(await getCachedFoodsByQuery("anything")).toEqual([]);
  });
});
