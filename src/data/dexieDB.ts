import Dexie from "dexie";
// Import canonical types
import { Item, Recipe, Icon } from "../types";

// Remove local Item definition
/*
export interface Item {
  id: string;
  name: string;
  category: string;
}
*/

// Remove local Recipe definition
/*
export interface Recipe {
  id: string;
  name: string;
  producers: string[];
  time: number;
  in: Record<string, number>;
  out: Record<string, number>;
}
*/

// Remove local Icon definition now that it's in types/index.ts
/*
export interface Icon {
  id: string;
  position: string;
  color: string;
}
*/

class SatisfactoryDatabase extends Dexie {
  // Use imported types
  items!: Dexie.Table<Item, string>; 
  recipes!: Dexie.Table<Recipe, string>;
  icons!: Dexie.Table<Icon, string>;

  constructor() {
    super("SatisfactoryDB");
    this.version(3).stores({
      items: "id, name, category",
      recipes: "id, name, *out", // Index out field for querying by output item
      icons: "id",
    });
    
  }

  // ✅ Centralized fetch function for recipes
  async getRecipeByOutput(itemId: string): Promise<Recipe | undefined> {
    const allRecipes = await this.recipes.toArray();
    const item = await this.items.get(itemId);

    // ✅ First, find the recipe where the name matches the item name (Default Recipe)
    let recipe = item ? allRecipes.find((r) => r.name === item.name) : undefined;

    // ✅ If no exact match is found, fall back to any valid recipe
    if (!recipe) {
      recipe = allRecipes.find((r) => Object.keys(r.out).includes(itemId));
    }

    return recipe;
  }


}

// ✅ Create and export the Dexie database instance
export const db = new SatisfactoryDatabase();
(window as any).db = db; // ✅ Attach to window for debugging
