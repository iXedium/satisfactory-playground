import { db } from "./dexieDB";
import itemsData from "./data/items.json";
import recipesData from "./data/recipes.json";

const populateDatabase = async () => {
  await db.transaction("rw", db.items, db.recipes, async () => {
    if ((await db.items.count()) === 0) {
      await db.items.bulkAdd(itemsData);
    }
    if ((await db.recipes.count()) === 0) {
      await db.recipes.bulkAdd(recipesData);
    }
  });
};

populateDatabase().catch((err) => {
  console.error("Failed to populate database:", err);
});
