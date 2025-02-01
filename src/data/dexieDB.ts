import Dexie from "dexie";

export interface Item {
  id: string;
  name: string;
  category: string;
}

export interface Recipe {
  id: string;
  name: string;
  producers: string[];
  time: number;
  in: Record<string, number>;
  out: Record<string, number>;
}

class SatisfactoryDatabase extends Dexie {
  items!: Dexie.Table<Item, string>;
  recipes!: Dexie.Table<Recipe, string>;

  constructor() {
    super("SatisfactoryDB");
    this.version(1).stores({
      items: "id, name, category",
      recipes: "id, name",
    });
    
  }

  // ✅ Centralized fetch function for recipes
  async getRecipeByOutput(itemId: string): Promise<Recipe | undefined> {
    const allRecipes = await this.recipes.toArray();

    // ✅ First, find the recipe where the name matches the itemId (Default Recipe)
    let recipe = allRecipes.find((r) => r.id === itemId);

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
