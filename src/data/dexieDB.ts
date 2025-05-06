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

    // 1. Prioritize recipes that actually output the itemId
    let recipe = allRecipes.find((r) => r.out && Object.keys(r.out).includes(itemId));

    // 2. If no direct outputting recipe (step 1 failed), AND item exists, 
    //    try to match by item name, BUT ONLY if that name-matched recipe ALSO outputs the itemId.
    //    This handles cases where item name might be unique to its producing recipe.
    if (!recipe && item) {
      const recipeByName = allRecipes.find((r) => r.name === item.name && r.out && Object.keys(r.out).includes(itemId));
      if (recipeByName) {
        recipe = recipeByName;
      }
    }
    // If after these steps, recipe is still undefined, it means no recipe produces this item directly,
    // or the name matching didn't yield a producing recipe.
    // The initial find (step 1) is the most reliable for finding *a* producer.

    return recipe;
  }


}

// ✅ Create and export the Dexie database instance
export const db = new SatisfactoryDatabase();
(window as any).db = db; // ✅ Attach to window for debugging
