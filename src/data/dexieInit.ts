import { db } from "./dexieDB";

const DB_VERSION_KEY = 'satisfactory-db-version';
const CURRENT_VERSION = 3;

export async function populateDexie() {
    const storedVersion = localStorage.getItem(DB_VERSION_KEY);
    const shouldReset = !storedVersion || Number(storedVersion) < CURRENT_VERSION;

    if (shouldReset) {
        console.log("⚠️ Database needs reset due to schema update...");
        
        try {
            // Delete the existing database
            await db.delete();
            // Recreate the database with new schema
            await db.open();
            
            console.log("⚠️ Populating database from JSON...");
            const response = await fetch("/data.json", { cache: "no-store" });
            const data = await response.json();

            await db.items.bulkPut(data.items);
            await db.recipes.bulkPut(data.recipes);
            await db.icons.bulkPut(data.icons);

            // Update stored version
            localStorage.setItem(DB_VERSION_KEY, String(CURRENT_VERSION));
            console.log("✅ Database has been reset and populated!");
        } catch (error) {
            console.error("🚨 Failed to reset/populate database:", error);
        }
    } else {
        console.log("✅ Database schema is up to date.");
    }
}
