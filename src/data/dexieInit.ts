import { db } from "./dexieDB";

export async function populateDexie() {
    const itemCount = await db.items.count();
    const recipeCount = await db.recipes.count();

    if (itemCount === 0 || recipeCount === 0) {
        console.log("⚠️ Dexie is empty, populating from JSON...");

        try {
            const response = await fetch("/data.json", { cache: "no-store" });
            const data = await response.json();

            await db.items.bulkPut(data.items);
            await db.recipes.bulkPut(data.recipes);

            console.log("✅ Dexie has been populated!");
        } catch (error) {
            console.error("🚨 Failed to populate Dexie:", error);
        }
    } else {
        console.log("✅ Dexie already contains data.");
    }
}
