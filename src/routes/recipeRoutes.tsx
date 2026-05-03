import { useParams, useSearch } from "@tanstack/react-router";
import { RecipeBuilder } from "./RecipeBuilder";

export function RecipeNewScreen() {
  const { seed } = useSearch({ from: "/recipes/new" });
  return <RecipeBuilder mode="new" seedFoodId={seed} />;
}

export function RecipeEditScreen() {
  const { recipeId } = useParams({ from: "/recipes/$recipeId" });
  return <RecipeBuilder mode="edit" recipeId={recipeId} />;
}
