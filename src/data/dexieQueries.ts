import { db } from "./dexieDB";

export const getComponents = async () => {
  return await db.items.where("category").equals("components").toArray();
};

export const getMachines = async () => {
  return await db.items.where("category").equals("other").toArray();
};

export const getParts = async () => {
  return await db.items.where("category").equals("parts").toArray();
};

export const getEquipment = async () => {
  return await db.items.where("category").equals("equipment").toArray();
};

export const getRecipesForItem = async (itemId: string) => {
  // Get all recipes and filter those that have the itemId in their out keys
  return await db.recipes
    .filter(recipe => Object.keys(recipe.out).includes(itemId))
    .toArray();
};

export const getIconForItem = async (itemId: string) => {
  return await db.icons.get(itemId);
};
