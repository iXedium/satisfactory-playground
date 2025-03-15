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
  const recipes = await db.recipes.where("out").equals(itemId).toArray();
  return recipes;
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

// Retrieve machine data for a recipe
export const getMachineForRecipe = async (recipeId: string): Promise<Machine | null> => {
  try {
    // First get the recipe to find the producer
    const recipe = await getRecipeById(recipeId);
    if (!recipe || !recipe.producers || recipe.producers.length === 0) {
      return null;
    }
    
    // Use the first producer in the list
    const producerId = recipe.producers[0];
    
    // Fetch the machine data from data.json
    const response = await fetch("/data.json");
    const data = await response.json();
    
    // Find the machine in the items array
    const machineData = data.items.find((item: any) => 
      item.id === producerId && item.machine
    );
    
    if (!machineData || !machineData.machine) {
      return null;
    }
    
    // Return the machine data with its ID and name
    return {
      id: machineData.id,
      name: machineData.name,
      ...machineData.machine
    };
  } catch (error) {
    console.error("Error fetching machine data:", error);
    return null;
  }
};

// Retrieve an icon for a given item.
export const getIconForItem = async (itemId: string) => await db.icons.get(itemId);
