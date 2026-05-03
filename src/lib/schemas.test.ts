import { describe, expect, it } from "vitest";
import { FoodSchema, FoodSearchResultSchema } from "./schemas";

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
