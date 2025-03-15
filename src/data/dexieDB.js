import Dexie from "dexie";
class SatisfactoryDatabase extends Dexie {
    items;
    recipes;
    icons;
    constructor() {
        super("SatisfactoryDB");
        this.version(3).stores({
            items: "id, name, category",
            recipes: "id, name, *out", // Index out field for querying by output item
            icons: "id",
        });
    }
    // ✅ Centralized fetch function for recipes
    async getRecipeByOutput(itemId) {
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
window.db = db; // ✅ Attach to window for debugging
