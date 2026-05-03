import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { db, type CachedFood, type CachedRecipeSummary } from "./db";

afterEach(async () => {
  await db.foods.clear();
  await db.recipeSummaries.clear();
});

describe("db", () => {
  it("declares the expected tables", () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual([
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
