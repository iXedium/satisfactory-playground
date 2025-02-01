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
    console.log("✅ Dexie Database Initialized"); // ✅ Debugging
  }

  // ✅ Centralized fetch function for recipes
  async getRecipeByOutput(itemId: string): Promise<Recipe | undefined> {
    const allRecipes = await this.recipes.toArray();
    return allRecipes.find((r) => Object.keys(r.out).includes(itemId));
  }

  // ✅ Ensure Database is Populated
  async initializeDatabase(data: { items: Item[]; recipes: Recipe[] }) {
    const itemCount = await this.items.count();
    const recipeCount = await this.recipes.count();

    if (itemCount === 0 || recipeCount === 0) {
      console.log("🌱 Populating Database...");
      await this.items.bulkAdd(data.items);
      await this.recipes.bulkAdd(data.recipes);
      console.log("✅ Database Populated!");
    } else {
      console.log("⚡ Database already contains data.");
    }
  }
}

// ✅ Create and Attach Database to `window` for Debugging
export const db = new SatisfactoryDatabase();
(window as any).db = db;
