import { db } from "./dexieDB";
import { Recipe, Item, Icon as IconType } from "../types";
import { logger } from "../utils/logger";

// Retrieve all items (including resources, components, etc.)
export const getAllItems = async (): Promise<Item[]> => await db.items.toArray();

// Retrieve all recipes
export const getAllRecipes = async (): Promise<Recipe[]> => await db.recipes.toArray();

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
  try {
    // First try to find recipes where the item is in the "out" field
    const recipes = await db.recipes.filter(recipe => {
      return recipe.out && Object.keys(recipe.out).includes(itemId);
    }).toArray();
    
    logger.info(`[dbQueries.getRecipesForItem] Recipes found for ${itemId}:`, recipes.map(r => r.id));
    
    if (recipes.length === 0) {
      // If no recipes found, try a different approach
      const allRecipes = await db.recipes.toArray();
      const matchingRecipes = allRecipes.filter(recipe => 
        recipe.out && Object.keys(recipe.out).includes(itemId)
      );
      return matchingRecipes;
    }
    
    return recipes;
  } catch (error) {
    logger.error(`Error finding recipes for ${itemId}:`, error);
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
    const recipe = await getRecipeById(recipeId);
    if (!recipe || !recipe.producers || recipe.producers.length === 0) {
      return null;
    }
    
    const producerId = recipe.producers[0];
    
    // Fetch the machine item from Dexie
    const machineItem = await db.items.get(producerId) as ItemWithMachine | undefined;
    
    if (!machineItem) {
      logger.warn(`[getMachineForRecipe] Machine item with ID '${producerId}' not found in Dexie DB for recipe '${recipeId}'.`);
      return null;
    }
    
    const machineDetails = machineItem.machine;
    if (!machineDetails) { 
      logger.warn(`[getMachineForRecipe] Machine item '${producerId}' exists but lacks a 'machine' property.`);
      return null; 
    }
      
    // Return the machine data with its ID and name
    return {
      id: machineItem.id,
      name: machineItem.name,
      ...machineDetails 
    };

  } catch (error) {
    logger.error(`Error in getMachineForRecipe for recipe '${recipeId}':`, error);
    return null;
  }
};

// Retrieve an icon for a given item.
export const getIconForItem = async (itemId: string): Promise<IconType | undefined> => {
  const item = await db.items.get(itemId);
  if (!item) {
    // console.warn(`[getIconForItem] Item with ID '${itemId}' not found.`);
    return undefined;
  }
  // If item has an explicit icon field, use that. Otherwise, use the itemId itself as the iconId.
  const iconIdToLookup = item.icon ? item.icon : itemId;
  return await db.icons.get(iconIdToLookup);
};
