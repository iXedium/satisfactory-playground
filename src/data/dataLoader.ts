import data from "../../public/data.json";
import { Item, Recipe } from "../types";

export interface DataStructure {
  items: Item[];
  recipes: Recipe[];
}

// Helper to clean recipe ingredients/products
const cleanRecipeMap = (map: Record<string, number | undefined> | undefined): Record<string, number> => {
  if (!map) return {};
  const cleanedMap: Record<string, number> = {};
  for (const key in map) {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      cleanedMap[key] = map[key] ?? 0; // Use 0 if value is null or undefined
    }
  }
  return cleanedMap;
};

export const loadData = (): DataStructure => {
  const loadedItems = [...data.items].sort((a, b) => a.name.localeCompare(b.name)) as Item[];
  
  // Clean and type-cast recipes
  const cleanedRecipes = data.recipes.map(recipe => ({
    ...recipe,
    in: cleanRecipeMap(recipe.in),
    out: cleanRecipeMap(recipe.out),
  })) as Recipe[]; // Assert as the correct Recipe type after cleaning

  return {
    items: loadedItems,
    recipes: cleanedRecipes,
  };
};
