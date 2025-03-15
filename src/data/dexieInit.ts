import { db } from "./dexieDB";

const DB_VERSION_KEY = 'satisfactory-db-version';
const CURRENT_VERSION = 3;

export async function populateDexie() {
    try {
        const storedVersion = localStorage.getItem(DB_VERSION_KEY);
        const shouldReset = !storedVersion || Number(storedVersion) < CURRENT_VERSION;

        if (shouldReset) {
            try {
                await db.delete();
                await db.open();
                
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

                // Check if data is valid
                if (!data.items || !data.recipes || !data.icons) {
                    throw new Error("Invalid data format in data.json");
                }

                // Populate the database
                await db.items.bulkPut(data.items);
                await db.recipes.bulkPut(data.recipes);
                await db.icons.bulkPut(data.icons);

                // Update stored version
                localStorage.setItem(DB_VERSION_KEY, String(CURRENT_VERSION));
                
                // Verify data was inserted correctly
                const itemCount = await db.items.count();
                const recipeCount = await db.recipes.count();
                const iconCount = await db.icons.count();
                
                if (itemCount === 0 || recipeCount === 0) {
                    throw new Error("Database population failed - no items or recipes found after insert");
                }
            } catch (error) {
                console.error("🚨 Failed to reset/populate database:", error);
                // Force a retry on next load
                localStorage.removeItem(DB_VERSION_KEY);
                throw error;
            }
        } else {
            // Verify data exists even if schema is up to date
            const itemCount = await db.items.count();
            const recipeCount = await db.recipes.count();
            
            if (itemCount === 0 || recipeCount === 0) {
                console.error("🚨 Database appears empty despite being marked as initialized");
                localStorage.removeItem(DB_VERSION_KEY);
                // Recursive call to repopulate
                return populateDexie();
            }
        }
    } catch (error) {
        console.error("🚨 Critical error in database initialization:", error);
        // Force a retry on next load
        localStorage.removeItem(DB_VERSION_KEY);
        throw error;
    }
}
