import Dexie from "dexie";

interface Item {
  id: string;
  name: string;
  // Add other relevant fields
}

interface Recipe {
  id: string;
  name: string;
  out: { [key: string]: number };
  in: { [key: string]: number };
  // Add other relevant fields
}

class SatisfactoryDatabase extends Dexie {
  public items: Dexie.Table<Item, string>;
  public recipes: Dexie.Table<Recipe, string>;

  constructor() {
    super("SatisfactoryDatabase");
    this.version(1).stores({
      items: "id, name", // Define indexes
      recipes: "id, name", // Define indexes
    });

    this.items = this.table("items");
    this.recipes = this.table("recipes");
  }
}

export const db = new SatisfactoryDatabase();

