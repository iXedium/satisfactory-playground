import { db } from "./dexieDB";

// Retrieve all items in the "components" category.
export const getComponents = async () => await db.items.where("category").equals("components").toArray();

// Retrieve all items in the "other" category.
export const getMachines = async () => await db.items.where("category").equals("other").toArray();

// Retrieve all items in the "parts" category.
export const getParts = async () => await db.items.where("category").equals("parts").toArray();

// Retrieve all items in the "equipment" category.
export const getEquipment = async () => await db.items.where("category").equals("equipment").toArray();

// Get recipes that produce a given item.
export const getRecipesForItem = async (itemId: string) =>
  await db.recipes.filter(recipe => Object.keys(recipe.out).includes(itemId)).toArray();

// Retrieve an icon for a given item.
export const getIconForItem = async (itemId: string) => await db.icons.get(itemId);

// Retrieve a single item by its ID
export const getItemById = async (itemId: string) => await db.items.get(itemId);

// Retrieve a recipe by its ID
export const getRecipeById = async (recipeId: string) => await db.recipes.get(recipeId);

// Get a recipe that produces a given item, prioritizing exact ID matches
export const getRecipeByOutput = async (itemId: string) => await db.getRecipeByOutput(itemId);
