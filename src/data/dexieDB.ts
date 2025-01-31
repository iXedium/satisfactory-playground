import Dexie, { Table } from "dexie";
import data from "./data.json";

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

export interface Icon {
  id: string;
  position: string;
  color: string;
}

class SatisfactoryDB extends Dexie {
  items!: Table<Item>;
  recipes!: Table<Recipe>;
  icons!: Table<Icon>;

  constructor() {
    super("SatisfactoryDB");
    this.version(1).stores({
      items: "id, name, category",
      recipes: "id, name, *producers, time, *out",
      icons: "id",
    });
  }
}

export const db = new SatisfactoryDB();

// ✅ Load data if empty
db.transaction("rw", db.items, db.recipes, db.icons, async () => {
  if ((await db.items.count()) === 0) {
    await db.items.bulkAdd(data.items);
    await db.recipes.bulkAdd(
      data.recipes.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        producers: recipe.producers,
        time: recipe.time,
        in: Object.fromEntries(
          Object.entries(recipe.in ?? {}).filter(([_, value]) => value !== undefined) // ✅ Remove undefined values from `in`
        ),
        out: Object.fromEntries(
          Object.entries(recipe.out ?? {}).filter(([_, value]) => value !== undefined) // ✅ Remove undefined values from `out`
        ),
      }))
    );
    
    
    
    await db.icons.bulkAdd(data.icons);
  }
}).catch((err) => {
  console.error("Failed to initialize database:", err);
});
