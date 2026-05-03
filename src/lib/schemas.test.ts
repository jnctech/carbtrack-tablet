import { describe, expect, it } from "vitest";
import recipeDetail from "./__fixtures__/recipeDetail.json";
import recipeSummaryList from "./__fixtures__/recipeSummaryList.json";
import {
  FoodSchema,
  FoodSearchResultSchema,
  RecipeDetailSchema,
  RecipeSummaryListSchema,
} from "./schemas";

const valid = {
  id: 1,
  name: "Banana, raw",
  brand: null,
  category: "fruit",
  carbs_per_100g: 22.8,
  sugars_per_100g: 12.2,
  fibre_per_100g: 2.6,
  gi_rating: "low",
  serving_size_g: 118,
  icon_key: "fruit_banana",
  active: true,
};

describe("FoodSchema", () => {
  it("accepts a complete food row", () => {
    expect(FoodSchema.parse(valid)).toEqual(valid);
  });

  it("accepts the minimal required fields only", () => {
    const minimal = {
      id: 2,
      name: "Plain item",
      carbs_per_100g: 0,
      active: true,
    };
    expect(FoodSchema.parse(minimal)).toMatchObject(minimal);
  });

  it("rejects a row missing carbs_per_100g", () => {
    const { carbs_per_100g: _drop, ...bad } = valid;
    void _drop;
    expect(FoodSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a non-positive id", () => {
    expect(FoodSchema.safeParse({ ...valid, id: 0 }).success).toBe(false);
  });
});

describe("FoodSearchResultSchema", () => {
  it("accepts an array of foods", () => {
    expect(FoodSearchResultSchema.parse([valid, valid]).length).toBe(2);
  });

  it("rejects a non-array payload", () => {
    expect(FoodSearchResultSchema.safeParse({ items: [valid] }).success).toBe(
      false,
    );
  });
});

describe("recipes-router fixture regression", () => {
  it("RecipeDetailSchema parses the pinned fixture", () => {
    const parsed = RecipeDetailSchema.parse(recipeDetail);
    expect(parsed.id).toBe(42);
    expect(parsed.attachments).toHaveLength(2);
    expect(parsed.ingredients).toHaveLength(3);
  });

  // Canary for ADR-001 follow-up: carbtrack-au's recipes router emits
  // _attachment_view WITHOUT recipe_id/created_at. If a future fixture refresh
  // accidentally adds those fields, the regression coverage that motivated
  // this fixture (Phase 4 hotfix #26) silently disappears.
  it("recipes-router attachment shape omits recipe_id and created_at", () => {
    const att = recipeDetail.attachments[0] as Record<string, unknown>;
    expect("recipe_id" in att).toBe(false);
    expect("created_at" in att).toBe(false);
  });

  it("RecipeSummaryListSchema parses the listing fixture", () => {
    const parsed = RecipeSummaryListSchema.parse(recipeSummaryList);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.pinned).toBe(true);
  });
});
