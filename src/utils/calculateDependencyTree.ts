import { db, Recipe } from "../data/dexieDB";

export interface DependencyNode {
  id: string;
  amount: number;
  uniqueId: string;
  isRoot?: boolean;
  isByproduct?: boolean;
  children?: DependencyNode[];
}

export const calculateDependencyTree = async (
  itemId: string,
  amount: number,
  selectedRecipeId: string | null, // ✅ Explicitly pass the correct recipe
  depth: number = 0
): Promise<DependencyNode> => {
  

  let recipe: Recipe | undefined;

  if (depth === 0 && selectedRecipeId) {
    // ✅ Use the user-selected recipe only for the root item
    recipe = await db.recipes.get(selectedRecipeId);
  } else {
    // ✅ Reuse the existing function instead of fetching manually
    recipe = await db.getRecipeByOutput(itemId);
  }
  if (!recipe) {
    
    return { id: itemId, amount, uniqueId: `${itemId}-${depth}`, children: [] };
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
    children: [...children, ...byproducts], // ✅ Include byproducts without processing them
  };
};