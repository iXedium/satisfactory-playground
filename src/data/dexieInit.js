import { db } from "./dexieDB";
const DB_VERSION_KEY = 'satisfactory-db-version';
const CURRENT_VERSION = 3;
export async function populateDexie() {
    try {
        const storedVersion = localStorage.getItem(DB_VERSION_KEY);
        const shouldReset = !storedVersion || Number(storedVersion) < CURRENT_VERSION;
        console.log(`Database check: Current version ${CURRENT_VERSION}, stored version ${storedVersion || 'none'}`);
        if (shouldReset) {
            console.log("⚠️ Database needs reset due to schema update...");
            try {
                // Delete the existing database
                await db.delete();
                console.log("✅ Old database deleted");
                // Recreate the database with new schema
                await db.open();
                console.log("✅ New database opened with updated schema");
                console.log("⚠️ Fetching data from data.json...");
                const response = await fetch("/data.json", {
                    cache: "no-store",
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch data.json: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                console.log(`✅ Data fetched: ${data.items.length} items, ${data.recipes.length} recipes, ${data.icons.length} icons`);
                // Check if data is valid
                if (!data.items || !data.recipes || !data.icons) {
                    throw new Error("Invalid data format in data.json");
                }
                // Populate the database
                await db.items.bulkPut(data.items);
                await db.recipes.bulkPut(data.recipes);
                await db.icons.bulkPut(data.icons);
                console.log("✅ Database populated with data");
                // Update stored version
                localStorage.setItem(DB_VERSION_KEY, String(CURRENT_VERSION));
                console.log("✅ Database has been reset and populated!");
                // Verify data was inserted correctly
                const itemCount = await db.items.count();
                const recipeCount = await db.recipes.count();
                const iconCount = await db.icons.count();
                console.log(`✅ Database verification: ${itemCount} items, ${recipeCount} recipes, ${iconCount} icons`);
                if (itemCount === 0 || recipeCount === 0) {
                    throw new Error("Database population failed - no items or recipes found after insert");
                }
            }
            catch (error) {
                console.error("🚨 Failed to reset/populate database:", error);
                // Force a retry on next load
                localStorage.removeItem(DB_VERSION_KEY);
                throw error;
            }
        }
        else {
            console.log("✅ Database schema is up to date.");
            // Verify data exists even if schema is up to date
            const itemCount = await db.items.count();
            const recipeCount = await db.recipes.count();
            console.log(`✅ Database verification: ${itemCount} items, ${recipeCount} recipes`);
            if (itemCount === 0 || recipeCount === 0) {
                console.error("🚨 Database appears empty despite being marked as initialized");
                localStorage.removeItem(DB_VERSION_KEY);
                // Recursive call to repopulate
                return populateDexie();
            }
        }
    }
    catch (error) {
        console.error("🚨 Critical error in database initialization:", error);
        // Force a retry on next load
        localStorage.removeItem(DB_VERSION_KEY);
        throw error;
    }
}
