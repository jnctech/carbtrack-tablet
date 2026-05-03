import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  db,
  getCachedFoodsByQuery,
  getCachedRecipeSummaries,
  hydrateFoods,
  hydrateRecipeSummaries,
  type CachedFood,
  type CachedRecipeSummary,
} from "./db";
import type { Food, RecipeSummary } from "./schemas";

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

const summary = (
  overrides: Partial<RecipeSummary> & Pick<RecipeSummary, "id" | "name">,
): RecipeSummary => ({
  servings: 1,
  pinned: false,
  active: true,
  ingredient_count: 0,
  thumb_url: null,
  updated_at: "2026-05-03T00:00:00Z",
  ...overrides,
});

describe("hydrateRecipeSummaries", () => {
  it("bulk-puts summaries with cached_at stamped", async () => {
    const before = Date.now();
    await hydrateRecipeSummaries([
      summary({ id: 1, name: "Soup", ingredient_count: 4 }),
      summary({ id: 2, name: "Salad", pinned: true, ingredient_count: 2 }),
    ]);
    const rows = await db.recipeSummaries.toArray();
    expect(rows).toHaveLength(2);
    const soup = rows.find((r) => r.id === 1);
    expect(soup?.name).toBe("Soup");
    expect(soup?.cached_at).toBeGreaterThanOrEqual(before);
    expect(soup?.thumb_url).toBeNull();
  });

  it("is a no-op for an empty list", async () => {
    await hydrateRecipeSummaries([]);
    expect(await db.recipeSummaries.count()).toBe(0);
  });
});

describe("getCachedRecipeSummaries", () => {
  it("sorts pinned first then alpha by name", async () => {
    await hydrateRecipeSummaries([
      summary({ id: 1, name: "Zebra cake" }),
      summary({ id: 2, name: "Apple pie" }),
      summary({ id: 3, name: "Banana bread", pinned: true }),
      summary({ id: 4, name: "Almond muffin", pinned: true }),
    ]);
    const out = await getCachedRecipeSummaries();
    expect(out.map((r) => r.id)).toEqual([4, 3, 2, 1]);
  });

  it("returns empty when cache is cold", async () => {
    expect(await getCachedRecipeSummaries()).toEqual([]);
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
