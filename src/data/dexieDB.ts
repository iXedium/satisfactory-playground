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
    console.log("✅ Dexie Database Initialized");
  }

  // ✅ Centralized fetch function for recipes
  async getRecipeByOutput(itemId: string): Promise<Recipe | undefined> {
    // Dexie does not support "where" on objects, so we manually filter
    const allRecipes = await this.recipes.toArray();
    return allRecipes.find((r) => Object.keys(r.out).includes(itemId));
  }
}

// ✅ Create and export the Dexie database instance
export const db = new SatisfactoryDatabase();
(window as any).db = db; // ✅ Attach to window for debugging
