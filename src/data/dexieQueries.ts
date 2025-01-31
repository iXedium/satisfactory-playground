import { db } from "./dexieDB";

export const getAllItems = async () => {
  return await db.items.toArray(); // ✅ Returns all items (cached)
};

export const getRecipesForItem = async (itemId: string) => {
  return await db.recipes.where("out").equals(itemId).toArray(); // ✅ Returns recipes for a specific item
};

export const getIconForItem = async (itemId: string) => {
  return await db.icons.get(itemId); // ✅ Returns the icon metadata for an item
};
