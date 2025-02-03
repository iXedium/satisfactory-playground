import { Recipe } from "../data/dexieDB";
import { getRecipeById, getRecipeByOutput, getRecipesForItem } from "../data/dbQueries";

export interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  isByproduct?: boolean;
  selectedRecipeId?: string;
  availableRecipes?: Recipe[];
  children?: DependencyNode[];
}

export const calculateDependencyTree = async (
  itemId: string,
  amount: number,
  selectedRecipeId: string | null, // ✅ Explicitly pass the correct recipe
  depth: number = 0
): Promise<DependencyNode> => {
  console.log("calculateDependencyTree called:", { itemId, amount, selectedRecipeId, depth });

  // Get available recipes for this item
  const availableRecipes = await getRecipesForItem(itemId);
  
  let recipe: Recipe | undefined;

  if (depth === 0 && selectedRecipeId) {
    // ✅ Use the user-selected recipe only for the root item
    recipe = await getRecipeById(selectedRecipeId);
  } else {
    // ✅ Use centralized query function
    recipe = await getRecipeByOutput(itemId);
  }
  if (!recipe) {
    
    return { 
      id: itemId, 
      amount, 
      uniqueId: `${itemId}-${depth}`,
      availableRecipes,
      children: [] 
    };
  }

  const outputAmount = recipe.out[itemId] ?? 1;
  const cyclesNeeded = amount / outputAmount;

  // ✅ Only process main inputs (skip byproducts)
  const children = await Promise.all(
    Object.entries(recipe.in).map(([inputItem, inputAmount]) =>
      calculateDependencyTree(inputItem, (inputAmount ?? 0) * cyclesNeeded, null, depth + 1)
    )
  );

  // ✅ Add byproducts but do NOT process them
  const byproducts = Object.entries(recipe.out)
    .filter(([outputItem]) => outputItem !== itemId) // ✅ Ensure only byproducts
    .map(([outputItem, outputAmount]) => ({
      id: outputItem,
      amount: -(outputAmount * cyclesNeeded), // ✅ Negative production rate
      uniqueId: `${outputItem}-${depth}`,
      isByproduct: true,
      children: [],
    }));

  return {
    id: itemId,
    amount,
    uniqueId: `${itemId}-${depth}`,
    isRoot: depth === 0,
    selectedRecipeId: recipe.id,
    availableRecipes,
    children: [...children, ...byproducts], // ✅ Include byproducts without processing them
  };
};
