import { z } from "zod";

export const FoodSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  carbs_per_100g: z.number(),
  sugars_per_100g: z.number().nullable().optional(),
  fibre_per_100g: z.number().nullable().optional(),
  gi_rating: z.string().nullable().optional(),
  serving_size_g: z.number().nullable().optional(),
  icon_key: z.string().nullable().optional(),
  active: z.boolean(),
});

export const FoodSearchResultSchema = z.array(FoodSchema);

export type Food = z.infer<typeof FoodSchema>;
export type FoodSearchResult = z.infer<typeof FoodSearchResultSchema>;
