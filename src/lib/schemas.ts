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

export const IngredientViewSchema = z.object({
  id: z.number().int().positive(),
  food_id: z.number().int().positive(),
  name: z.string(),
  carbs_per_100g: z.number(),
  quantity_g: z.number().positive(),
  carbs_g: z.number(),
  sort_order: z.number().int(),
});

export const AttachmentViewSchema = z.object({
  id: z.number().int().positive(),
  kind: z.string(),
  filename: z.string(),
  mime_type: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  sort_order: z.number().int(),
  url: z.string(),
  thumb_url: z.string(),
});

export const RecipeSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  servings: z.number().int().positive(),
  pinned: z.boolean(),
  active: z.boolean(),
  ingredient_count: z.number().int().nonnegative(),
  thumb_url: z.string().nullable(),
  updated_at: z.string(),
});

export const RecipeSummaryListSchema = z.array(RecipeSummarySchema);

export const RecipeDetailSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  servings: z.number().int().positive(),
  notes: z.string().nullable(),
  pinned: z.boolean(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  ingredients: z.array(IngredientViewSchema),
  attachments: z.array(AttachmentViewSchema),
  total_carbs_g: z.number(),
});

export const CalculateIngredientSchema = z.object({
  food_id: z.number().int().positive(),
  name: z.string(),
  quantity_g: z.number().positive(),
  carbs_g: z.number(),
});

export const CalculateResultSchema = z.object({
  total_carbs_g: z.number(),
  ingredients: z.array(CalculateIngredientSchema),
});

export const IngredientInSchema = z.object({
  food_id: z.number().int().positive(),
  quantity_g: z.number().positive(),
  sort_order: z.number().int().nonnegative(),
});

export const RecipeWriteSchema = z.object({
  name: z.string().min(1),
  servings: z.number().int().positive(),
  notes: z.string().nullable().optional(),
  pinned: z.boolean(),
  ingredients: z.array(IngredientInSchema),
});

export const CalculateItemSchema = z.object({
  food_id: z.number().int().positive(),
  quantity_g: z.number().positive(),
});

export type IngredientView = z.infer<typeof IngredientViewSchema>;
export type AttachmentView = z.infer<typeof AttachmentViewSchema>;
export type RecipeSummary = z.infer<typeof RecipeSummarySchema>;
export type RecipeDetail = z.infer<typeof RecipeDetailSchema>;
export type CalculateResult = z.infer<typeof CalculateResultSchema>;
export type CalculateIngredient = z.infer<typeof CalculateIngredientSchema>;
export type IngredientIn = z.infer<typeof IngredientInSchema>;
export type RecipeWrite = z.infer<typeof RecipeWriteSchema>;
export type CalculateItem = z.infer<typeof CalculateItemSchema>;
