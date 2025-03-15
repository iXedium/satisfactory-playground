import { db, Recipe, Item } from "./dexieDB";

// Retrieve all items in the "components" category.
export const getComponents = async () => await db.items.where("category").equals("components").toArray();

// Retrieve all items in the "other" category.
export const getMachines = async () => await db.items.where("category").equals("other").toArray();

// Retrieve all items in the "parts" category.
export const getParts = async () => await db.items.where("category").equals("parts").toArray();

// Retrieve all items in the "equipment" category.
export const getEquipment = async () => await db.items.where("category").equals("equipment").toArray();

// Retrieve an item by its ID.
export const getItemById = async (id: string): Promise<Item | undefined> => await db.items.get(id);

// Retrieve a recipe by its ID.
export const getRecipeById = async (id: string): Promise<Recipe | undefined> => await db.recipes.get(id);

// Retrieve recipes that produce a specific item.
export const getRecipesForItem = async (itemId: string): Promise<Recipe[]> => {
  console.log(`Looking for recipes with output: ${itemId}`);
  try {
    // First try to find recipes where the item is in the "out" field
    const recipes = await db.recipes.filter(recipe => {
      return recipe.out && Object.keys(recipe.out).includes(itemId);
    }).toArray();
    
    console.log(`Found ${recipes.length} recipes for ${itemId} using filter method`);
    
    if (recipes.length === 0) {
      // If no recipes found, try a different approach
      console.log(`No recipes found with filter, trying direct query`);
      const allRecipes = await db.recipes.toArray();
      const matchingRecipes = allRecipes.filter(recipe => 
        recipe.out && Object.keys(recipe.out).includes(itemId)
      );
      console.log(`Found ${matchingRecipes.length} recipes using direct query`);
      return matchingRecipes;
    }
    
    return recipes;
  } catch (error) {
    console.error(`Error finding recipes for ${itemId}:`, error);
    return [];
  }
};

// Retrieve the default recipe for an item.
export const getRecipeByOutput = async (itemId: string): Promise<Recipe | undefined> => {
  return await db.getRecipeByOutput(itemId);
};

// Interface for machine data
export interface Machine {
  id: string;
  name: string;
  speed: number;
  type: string;
  usage: number;
  modules?: number;
}

// Interface for item data with machine property
interface ItemWithMachine extends Item {
  machine?: {
    speed: number;
    type: string;
    usage: number;
    modules?: number;
  };
}

// Retrieve machine data for a recipe
export const getMachineForRecipe = async (recipeId: string): Promise<Machine | null> => {
  try {
    // First get the recipe to find the producer
    const recipe = await getRecipeById(recipeId);
    if (!recipe || !recipe.producers || recipe.producers.length === 0) {
      console.warn(`No producers found for recipe: ${recipeId}`);
      return null;
    }
    
    // Use the first producer in the list
    const producerId = recipe.producers[0];
    console.log(`Looking for machine data for producer: ${producerId}`);
    
    try {
      // Fetch the machine data from data.json
      const response = await fetch("/data.json");
      
      if (!response.ok) {
        console.error(`Failed to fetch data.json: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      
      // Find the machine in the items array
      const machineData = data.items.find((item: ItemWithMachine) => 
        item.id === producerId && item.machine
      );
      
      if (!machineData || !machineData.machine) {
        console.warn(`No machine data found for producer: ${producerId}`);
        return null;
      }
      
      console.log(`Found machine data for ${machineData.name}`);
      
      // Return the machine data with its ID and name
      return {
        id: machineData.id,
        name: machineData.name,
        ...machineData.machine
      };
    } catch (fetchError) {
      console.error("Error fetching or parsing data.json:", fetchError);
      
      // Fallback to a default machine if data.json can't be loaded
      console.log("Using fallback machine data");
      return {
        id: producerId,
        name: "Unknown Machine",
        speed: 1,
        type: "unknown",
        usage: 0
      };
    }
  } catch (error) {
    console.error("Error in getMachineForRecipe:", error);
    return null;
  }
};

// Retrieve an icon for a given item.
export const getIconForItem = async (itemId: string) => await db.icons.get(itemId);
